import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { ListCertificatesQueryDto } from './dto/list-certificates-query.dto';
import {
  Certificate,
  CertificateDocument,
} from './schemas/certificate.schema';

@Injectable()
export class CertificatesService {
  constructor(
    @InjectModel(Certificate.name)
    private readonly certificateModel: Model<CertificateDocument>,
  ) {}

  async create(dto: CreateCertificateDto) {
    try {
      const doc = await this.certificateModel.create({
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        country: dto.country.trim().toUpperCase(),
        isActive: true,
      });

      return doc;
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new BadRequestException(
          'A certificate with this code already exists for this country',
        );
      }
      throw error;
    }
  }

  async list(query: ListCertificatesQueryDto) {
    const filter: Record<string, any> = {};

    if (query.country) {
      filter.country = query.country.trim().toUpperCase();
    }

    if (query.isActive === 'true') {
      filter.isActive = true;
    }

    if (query.isActive === 'false') {
      filter.isActive = false;
    }

    if (query.search) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ code: regex }, { name: regex }];
    }

    return this.certificateModel.find(filter).sort({ code: 1 }).lean();
  }

  async get(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid certificate id');
    }

    const doc = await this.certificateModel.findById(id).lean();

    if (!doc) {
      throw new NotFoundException('Certificate not found');
    }

    return doc;
  }

  async update(id: string, dto: UpdateCertificateDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid certificate id');
    }

    const updatePayload: Record<string, any> = {};

    if (dto.code !== undefined) {
      updatePayload.code = dto.code.trim().toUpperCase();
    }

    if (dto.name !== undefined) {
      updatePayload.name = dto.name.trim();
    }

    if (dto.country !== undefined) {
      updatePayload.country = dto.country.trim().toUpperCase();
    }

    try {
      const updated = await this.certificateModel
        .findByIdAndUpdate(id, updatePayload, {
          new: true,
          runValidators: true,
        })
        .lean();

      if (!updated) {
        throw new NotFoundException('Certificate not found');
      }

      return updated;
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new BadRequestException(
          'A certificate with this code already exists for this country',
        );
      }
      throw error;
    }
  }

  async deactivate(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid certificate id');
    }

    const updated = await this.certificateModel
      .findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true, runValidators: true },
      )
      .lean();

    if (!updated) {
      throw new NotFoundException('Certificate not found');
    }

    return updated;
  }

  async activate(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid certificate id');
    }

    const updated = await this.certificateModel
      .findByIdAndUpdate(
        id,
        { isActive: true },
        { new: true, runValidators: true },
      )
      .lean();

    if (!updated) {
      throw new NotFoundException('Certificate not found');
    }

    return updated;
  }
}