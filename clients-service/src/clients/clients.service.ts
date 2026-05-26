import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { Client, ClientDocument } from './schemas/client.schema';

@Injectable()
export class ClientsService {
    constructor(
        @InjectModel(Client.name)
        private readonly clientModel: Model<ClientDocument>,
    ) { }

    private normalizeName(name: string): string {
        return name.trim().replace(/\s+/g, ' ').toLowerCase();
    }

    async create(dto: CreateClientDto) {
        const normalizedName = this.normalizeName(dto.name);

        try {
            const client = await this.clientModel.create({
                name: dto.name.trim(),
                normalizedName,
                country: dto.country.trim().toUpperCase(),
                addressLine1: dto.addressLine1.trim(),
                city: dto.city.trim(),
                postcode: dto.postcode.trim(),
                region: dto.region.trim(),
                timeZone: dto.timeZone?.trim() || 'Europe/London',
                contactName: dto.contactName?.trim() || null,
                contactEmail: dto.contactEmail?.trim().toLowerCase() || null,
                contactPhone: dto.contactPhone?.trim() || null,
                isActive: dto.isActive ?? true,
            });

            return client;
        } catch (error: any) {
            if (error?.code === 11000) {
                throw new BadRequestException('A client with this name already exists for this country');
            }
            throw error;
        }
    }

    async list(query: ListClientsQueryDto) {
        const filter: any = {};

        if (query.country) {
            filter.country = query.country.trim().toUpperCase();
        }

        if (query.isActive !== undefined) {
            filter.isActive = query.isActive === 'true';
        }

        if (query.search?.trim()) {
            const search = query.search.trim();
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } },
                { postcode: { $regex: search, $options: 'i' } },
                { contactName: { $regex: search, $options: 'i' } },
                { contactEmail: { $regex: search, $options: 'i' } },
            ];
        }

        return this.clientModel.find(filter).sort({ name: 1 }).lean();
    }

    async get(id: string) {
        const client = await this.clientModel.findById(id).lean();
        if (!client) throw new NotFoundException('Client not found');
        return client;
    }

    async update(id: string, dto: UpdateClientDto) {
        const existing = await this.clientModel.findById(id);
        if (!existing) throw new NotFoundException('Client not found');

        if (dto.name !== undefined) {
            existing.name = dto.name.trim();
            existing.normalizedName = this.normalizeName(dto.name);
        }

        if (dto.country !== undefined) {
            existing.country = dto.country.trim().toUpperCase();
        }

        if (dto.addressLine1 !== undefined) {
            existing.addressLine1 = dto.addressLine1.trim();
        }

        if (dto.city !== undefined) {
            existing.city = dto.city.trim();
        }

        if (dto.postcode !== undefined) {
            existing.postcode = dto.postcode.trim();
        }

        if (dto.region !== undefined) {
            existing.region = dto.region.trim();
        }

        if (dto.timeZone !== undefined) {
            existing.timeZone = dto.timeZone.trim();
        }

        if (dto.contactName !== undefined) {
            existing.contactName = dto.contactName?.trim() || null;
        }

        if (dto.contactEmail !== undefined) {
            existing.contactEmail = dto.contactEmail?.trim().toLowerCase() || null;
        }

        if (dto.contactPhone !== undefined) {
            existing.contactPhone = dto.contactPhone?.trim() || null;
        }

        if (dto.isActive !== undefined) {
            existing.isActive = dto.isActive;
        }

        try {
            await existing.save();
            return existing;
        } catch (error: any) {
            if (error?.code === 11000) {
                throw new BadRequestException('A client with this name already exists for this country');
            }
            throw error;
        }
    }

    async deactivate(id: string) {
        const client = await this.clientModel.findById(id);
        if (!client) throw new NotFoundException('Client not found');

        client.isActive = false;
        await client.save();

        return client;
    }

    async activate(id: string) {
        const client = await this.clientModel.findById(id);
        if (!client) throw new NotFoundException('Client not found');

        client.isActive = true;
        await client.save();

        return client;
    }

    async getClientSnapshot(clientId: string) {
        const client = await this.clientModel.findById(clientId).lean();
        if (!client) throw new NotFoundException('Client not found');

        return {
            clientId: String(client._id),
            clientNameSnapshot: client.name,
            country: client.country,
            addressLine1: client.addressLine1,
            city: client.city,
            postcode: client.postcode,
            region: client.region,
            timeZone: client.timeZone,
            isActive: client.isActive,
        };
    }
}