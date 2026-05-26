import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Job, JobDocument, JobStatus } from './schemas/job.schema';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
  ) {}

  async create(dto: CreateJobDto, createdByUserId: string) {
    if (!Types.ObjectId.isValid(createdByUserId)) {
      throw new BadRequestException('Invalid user id');
    }

    if (dto.startTimeLocal >= dto.endTimeLocal) {
      throw new BadRequestException('startTimeLocal must be earlier than endTimeLocal');
    }

    const job = await this.jobModel.create({
      ...dto,
      clientId: null,
      requiredCertificateTypes: dto.requiredCertificateTypes ?? [],
      status: JobStatus.OPEN,
      cancelledAt: null,
      cancelledByUserId: null,
      cancelReason: null,
      completedAt: null,
      completedByUserId: null,
      completionNote: null,
      createdByUserId: new Types.ObjectId(createdByUserId),
    });

    return job;
  }

  async list(country?: string, status?: JobStatus) {
    const filter: Record<string, any> = {};

    if (country) filter.country = country;
    if (status) filter.status = status;

    return this.jobModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async get(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid job id');
    }

    const job = await this.jobModel.findById(id).lean();
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async update(id: string, dto: UpdateJobDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid job id');
    }

    const job = await this.jobModel.findById(id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException('Only open jobs can be edited');
    }

    const nextStart = dto.startTimeLocal ?? job.startTimeLocal;
    const nextEnd = dto.endTimeLocal ?? job.endTimeLocal;

    if (nextStart >= nextEnd) {
      throw new BadRequestException('startTimeLocal must be earlier than endTimeLocal');
    }

    if (dto.country !== undefined) job.country = dto.country.trim();
    if (dto.clientNameSnapshot !== undefined) job.clientNameSnapshot = dto.clientNameSnapshot.trim();
    if (dto.jobTitle !== undefined) job.jobTitle = dto.jobTitle.trim();
    if (dto.locationText !== undefined) job.locationText = dto.locationText.trim();
    if (dto.location !== undefined) {
      job.location = {
        ...job.location,
        ...dto.location,
      };
    }
    if (dto.timeZone !== undefined) job.timeZone = dto.timeZone.trim();
    if (dto.startTimeLocal !== undefined) job.startTimeLocal = dto.startTimeLocal;
    if (dto.endTimeLocal !== undefined) job.endTimeLocal = dto.endTimeLocal;
    if (dto.description !== undefined) job.description = dto.description?.trim() || undefined;
    if (dto.requiredCertificateTypes !== undefined) {
      job.requiredCertificateTypes = dto.requiredCertificateTypes;
    }

    await job.save();
    return job;
  }

  async cancel(id: string, actorUserId: string, reason: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid job id');
    }

    if (!Types.ObjectId.isValid(actorUserId)) {
      throw new BadRequestException('Invalid actor user id');
    }

    const job = await this.jobModel.findById(id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status === JobStatus.CANCELLED) {
      throw new BadRequestException('Job is already cancelled');
    }

    if (job.status === JobStatus.COMPLETED) {
      throw new BadRequestException('Completed job cannot be cancelled');
    }

    job.status = JobStatus.CANCELLED;
    job.cancelledAt = new Date();
    job.cancelledByUserId = new Types.ObjectId(actorUserId);
    job.cancelReason = reason;

    job.completedAt = null;
    job.completedByUserId = null;
    job.completionNote = null;

    await job.save();
    return job;
  }

  async complete(id: string, actorUserId: string, note?: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid job id');
    }

    if (!Types.ObjectId.isValid(actorUserId)) {
      throw new BadRequestException('Invalid actor user id');
    }

    const job = await this.jobModel.findById(id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status === JobStatus.CANCELLED) {
      throw new BadRequestException('Cancelled job cannot be completed');
    }

    if (job.status === JobStatus.COMPLETED) {
      throw new BadRequestException('Job is already completed');
    }

    job.status = JobStatus.COMPLETED;
    job.completedAt = new Date();
    job.completedByUserId = new Types.ObjectId(actorUserId);
    job.completionNote = note?.trim() || null;

    job.cancelledAt = null;
    job.cancelledByUserId = null;
    job.cancelReason = null;

    await job.save();
    return job;
  }
}