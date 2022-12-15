import { IsNumber, IsOptional, IsString } from 'class-validator';

export class invoiceDto {
  @IsString()
  request: string;

  @IsNumber()
  @IsOptional()
  max_fee_rate?: number;
}
