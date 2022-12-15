import { Body, Controller, Post } from '@nestjs/common';

import { AppService } from './app.service';
import { invoiceDto } from './class_controller';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  async getInvoice(@Body() args: invoiceDto): Promise<any> {
    return this.appService.getInvoice(args);
  }
}
