import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TimeOffRequest,
  TimeOffRequestDocument,
  TimeOffStatus,
} from '../time-off/schemas/time-off-request.schema';

import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(TimeOffRequest.name, 'engineers')
    private readonly timeOffModel: Model<TimeOffRequestDocument>,

    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) { }

  private toDate(value: string): Date {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
    return d;
  }

  private normalizeToUtcMidnight(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private validateRange(from: Date, to: Date) {
    if (to <= from) throw new BadRequestException('to must be after from');
  }

  private buildDaysForRange(fromMidnight: Date, toMidnight: Date): Date[] {
    if (toMidnight < fromMidnight) throw new BadRequestException('to must be >= from');

    const days: Date[] = [];
    const cursor = new Date(fromMidnight.getTime());
    while (cursor.getTime() <= toMidnight.getTime()) {
      days.push(new Date(cursor.getTime()));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    // keep consistent with time-off cap
    if (days.length > 60) throw new BadRequestException('Window cannot exceed 60 days');
    return days;
  }


  private async hasAssignmentConflict(
    engineerId: string,
    fromIso: string,
    toIso: string,
    token?: string,
  ) {
    const baseUrl = this.config.get<string>('JOBS_SERVICE_URL');
    if (!baseUrl) throw new Error('JOBS_SERVICE_URL is missing');

    const url = `${baseUrl}/assignments/conflicts`;
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const res = await firstValueFrom(
        this.http.get(url, {
          params: { engineerId, from: fromIso, to: toIso },
          headers,
        }),
      );
      return Boolean(res.data?.hasConflicts);
    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 401) throw new UnauthorizedException('Unauthorized to query assignment conflicts');
      if (status === 403) throw new ForbiddenException('Forbidden to query assignment conflicts');

      throw new ServiceUnavailableException('Jobs service unavailable');
    }
  }

  async isEngineerAvailable(
    engineerId: string,
    fromIso: string,
    toIso: string,
    token?: string,
  ) {
    const from = this.toDate(fromIso);
    const to = this.toDate(toIso);
    this.validateRange(from, to);

    const engineerObjectId = new Types.ObjectId(engineerId);

    // For consistent blocking across RANGE + MULTI, block using days[]
    const fromMidnight = this.normalizeToUtcMidnight(from);
    const toMidnight = this.normalizeToUtcMidnight(to);
    const windowDays = this.buildDaysForRange(fromMidnight, toMidnight);

    const timeOffBlocked = await this.timeOffModel.exists({
      engineerId: engineerObjectId,
      status: TimeOffStatus.APPROVED,
      days: { $in: windowDays },
    });

    const assignmentBlocked = await this.hasAssignmentConflict(
      engineerId,
      fromMidnight.toISOString(),
      toMidnight.toISOString(),
      token,
    );

    return {
      engineerId,
      from: fromMidnight.toISOString(),
      to: toMidnight.toISOString(),
      isAvailable: !timeOffBlocked && !assignmentBlocked,
      reasons: [
        ...(timeOffBlocked ? ['TIME_OFF_APPROVED'] : []),
        ...(assignmentBlocked ? ['ASSIGNMENT_CONFLICT'] : []),
      ],
    };
  }
  async checkBulk(
    engineerIds: string[],
    fromIso: string,
    toIso: string,
    token?: string,
  ) {
    const from = this.toDate(fromIso);
    const to = this.toDate(toIso);
    this.validateRange(from, to);

    const fromMidnight = this.normalizeToUtcMidnight(from);
    const toMidnight = this.normalizeToUtcMidnight(to);
    const windowDays = this.buildDaysForRange(fromMidnight, toMidnight);

    // Validate IDs
    const ids = engineerIds.map((id) => {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(`Invalid engineerId: ${id}`);
      }
      return new Types.ObjectId(id);
    });

    // 1) Time off conflicts in one query
    const timeOffRows = await this.timeOffModel
      .find(
        {
          engineerId: { $in: ids },
          status: TimeOffStatus.APPROVED,
          days: { $in: windowDays },
        },
        { engineerId: 1 },
      )
      .lean();

    const timeOffBlockedSet = new Set(timeOffRows.map((r: any) => String(r.engineerId)));

    // 2) Assignment conflicts (best is bulk from jobs-service, but we can parallel for now)
    // For MVP: parallel per engineer, still OK because it’s server-to-server and fast.
    const assignmentBlockedPairs = await Promise.all(
      engineerIds.map(async (engineerId) => {
        const blocked = await this.hasAssignmentConflict(
          engineerId,
          fromMidnight.toISOString(),
          toMidnight.toISOString(),
          token,
        );
        return [engineerId, blocked] as const;
      }),
    );

    const assignmentBlockedMap = new Map<string, boolean>(assignmentBlockedPairs);

    // 3) Build results in same shape as /check
    const results = engineerIds.map((engineerId) => {
      const timeOffBlocked = timeOffBlockedSet.has(engineerId);
      const assignmentBlocked = assignmentBlockedMap.get(engineerId) === true;

      return {
        engineerId,
        from: fromMidnight.toISOString(),
        to: toMidnight.toISOString(),
        isAvailable: !timeOffBlocked && !assignmentBlocked,
        reasons: [
          ...(timeOffBlocked ? ['TIME_OFF_APPROVED'] : []),
          ...(assignmentBlocked ? ['ASSIGNMENT_CONFLICT'] : []),
        ],
      };
    });

    return {
      from: fromMidnight.toISOString(),
      to: toMidnight.toISOString(),
      total: results.length,
      results,
    };
  }
}