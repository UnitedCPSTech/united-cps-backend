import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CertificateDocument = Certificate & Document;

@Schema({ collection: 'certificates', timestamps: true })
export class Certificate {
  @Prop({ type: String, required: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, trim: true, uppercase: true, index: true })
  country!: string;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;
}

export const CertificateSchema = SchemaFactory.createForClass(Certificate);

CertificateSchema.index({ code: 1, country: 1 }, { unique: true });
CertificateSchema.index({ name: 1, country: 1 });