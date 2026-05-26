import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EngineerDocument = HydratedDocument<Engineer>;

export enum EngineerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Schema({ timestamps: true })
export class Engineer {
  @Prop({ required: true, trim: true, index: true })
  firstName!: string;

  @Prop({ required: true, trim: true, index: true })
  lastName!: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true, index: true })
  email!: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true, index: true })
  country?: string;

  @Prop({ trim: true, index: true })
  city?: string;

  @Prop({ type: [String], default: [], index: true })
  skills?: string[];

  @Prop({ type: [String], default: [], index: true })
  certifications?: string[];

  @Prop({
    type: String,
    enum: EngineerStatus,
    default: EngineerStatus.ACTIVE,
    index: true,
  })
  status?: EngineerStatus;

  @Prop({ type: Boolean, default: true, index: true })
  isAvailable?: boolean;

  // Link to auth-service user id when account is connected
  @Prop({ type: String, default: null })
  userId?: string | null;
}

export const EngineerSchema = SchemaFactory.createForClass(Engineer);

EngineerSchema.index({ lastName: 1, firstName: 1 });
EngineerSchema.index({ country: 1, city: 1 });
EngineerSchema.index({ status: 1, isAvailable: 1 });

EngineerSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $type: 'string' },
    },
  },
);