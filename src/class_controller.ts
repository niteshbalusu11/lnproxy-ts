import { IsString } from 'class-validator';

export class invoiceDto {
  @IsString()
  request: string;
}
