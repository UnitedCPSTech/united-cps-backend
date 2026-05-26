import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClientDocument = Client & Document;

@Schema({ collection: 'clients', timestamps: true })
export class Client {
  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  name!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 10, index: true })
  country!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 200 })
  addressLine1!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  city!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 20 })
  postcode!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  region!: string;

  @Prop({ type: String, required: true, trim: true, default: 'Europe/London', maxlength: 100 })
  timeZone!: string;

  @Prop({ type: String, trim: true, maxlength: 100, default: null })
  contactName!: string | null;

  @Prop({ type: String, trim: true, lowercase: true, maxlength: 150, default: null })
  contactEmail!: string | null;

  @Prop({ type: String, trim: true, maxlength: 30, default: null })
  contactPhone!: string | null;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  @Prop({ type: String, required: true, trim: true, maxlength: 120, select: false })
  normalizedName!: string;
}

export const ClientSchema = SchemaFactory.createForClass(Client);

ClientSchema.index(
  { country: 1, normalizedName: 1 },
  { unique: true },
);