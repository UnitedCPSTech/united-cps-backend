import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JobDocument = Job & Document;

export enum JobStatus {
  OPEN = 'OPEN',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Schema({ collection: 'jobs', timestamps: true })
export class Job {
  @Prop({ type: String, required: true, index: true })
  country!: string;

  @Prop({ type: Types.ObjectId, default: null })
  clientId!: Types.ObjectId | null;

  @Prop({ type: String, required: true })
  clientNameSnapshot!: string;

  @Prop({ type: String, required: true })
  jobTitle!: string;

  @Prop({ type: String, required: true })
  locationText!: string;

  @Prop({
    type: Object,
    required: true,
  })
  location!: {
    addressLine1?: string;
    city?: string;
    postcode?: string | null;
    region?: string;
    country: string;
  };

  @Prop({ type: String, default: 'Europe/London' })
  timeZone!: string;

  @Prop({ type: String, required: true })
  startTimeLocal!: string;

  @Prop({ type: String, required: true })
  endTimeLocal!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: [String], default: [] })
  requiredCertificateTypes!: string[];

  @Prop({
    type: String,
    enum: Object.values(JobStatus),
    default: JobStatus.OPEN,
    index: true,
  })
  status!: JobStatus;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  cancelledByUserId!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  cancelReason!: string | null;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  completedByUserId!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  completionNote!: string | null;

  @Prop({ type: Types.ObjectId, required: true })
  createdByUserId!: Types.ObjectId;
}

export const JobSchema = SchemaFactory.createForClass(Job);
JobSchema.index({ country: 1, status: 1, createdAt: -1 });