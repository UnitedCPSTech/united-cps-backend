import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateEngineerDto } from './dto/create-engineer.dto';
import { UpdateEngineerDto } from './dto/update-engineer.dto';
import { QueryEngineersDto } from './dto/query-engineers.dto';
import { Engineer, EngineerDocument } from './schemas/engineer.schema';

@Injectable()
export class EngineersService {
  constructor(
  @InjectModel(Engineer.name, 'engineers')
  private readonly engineerModel: Model<EngineerDocument>,
) {}


  async create(dto: CreateEngineerDto) {
    const email = dto.email.toLowerCase();

    const existing = await this.engineerModel.findOne({ email }).lean();
    if (existing) throw new ConflictException('Engineer with this email already exists');

    const created = await this.engineerModel.create({
      ...dto,
      email,
    });

    return created.toObject();
  }

  async findOne(id: string) {
    const doc = await this.engineerModel.findById(id).lean();
    if (!doc) throw new NotFoundException('Engineer not found');
    return doc;
  }

  async update(id: string, dto: UpdateEngineerDto) {
    if (dto.email) dto.email = dto.email.toLowerCase();

    if (dto.email) {
      const existing = await this.engineerModel
        .findOne({ email: dto.email, _id: { $ne: id } })
        .lean();
      if (existing) throw new ConflictException('Engineer with this email already exists');
    }

    const doc = await this.engineerModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();

    if (!doc) throw new NotFoundException('Engineer not found');
    return doc;
  }

  async remove(id: string) {
    const doc = await this.engineerModel.findByIdAndDelete(id).lean();
    if (!doc) throw new NotFoundException('Engineer not found');
    return { deleted: true };
  }

  async list(query: QueryEngineersDto) {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};

  // ---- COUNTRY (partial + case insensitive)
  if (query.country?.trim()) {
    const country = query.country.trim();
    filter.country = new RegExp(
      country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i',
    );
  }

  // ---- CITY (partial + case insensitive)
  if (query.city?.trim()) {
    const city = query.city.trim();
    filter.city = new RegExp(
      city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i',
    );
  }

  if (query.status) filter.status = query.status;

  if (typeof query.isAvailable === 'boolean') {
    filter.isAvailable = query.isAvailable;
  }

  // ---- SEARCH (improved full-name handling)
  if (query.search?.trim()) {
    const s = query.search.trim();
    const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const parts = s.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      const [first, ...rest] = parts;
      const last = rest.join(' ');

      const firstRegex = new RegExp(
        first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );

      const lastRegex = new RegExp(
        last.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );

      filter.$or = [
        { firstName: firstRegex },
        { lastName: lastRegex },
        {
          $and: [
            { firstName: firstRegex },
            { lastName: lastRegex },
          ],
        },
        { email: regex },
        { phone: regex },
      ];
    } else {
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
      ];
    }
  }

  const [items, total] = await Promise.all([
    this.engineerModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.engineerModel.countDocuments(filter),
  ]);

  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    items,
  };
}
async findByUserId(userId: string) {
  const doc = await this.engineerModel.findOne({ userId }).lean();
  if (!doc) throw new NotFoundException('Engineer profile not found');
  return doc;
}

async findMe(userId: string, email: string) {
  // 1) Primary: linked account
  let doc = await this.engineerModel.findOne({ userId }).lean();
  if (doc) return doc;

  // 2) Fallback: match by email from signed JWT
  const normalizedEmail = email.toLowerCase().trim();
  doc = await this.engineerModel.findOne({ email: normalizedEmail }).lean();
  if (!doc) throw new NotFoundException('Engineer profile not found');

  // 3) Auto-link, only if it is not already linked
  if (!doc.userId) {
    await this.engineerModel.updateOne(
      { _id: doc._id },
      { $set: { userId } },
    );
    doc = await this.engineerModel.findById(doc._id).lean();
  }

  return doc;
}


}
