import { PartialType } from '@nestjs/mapped-types';
import { CreateB2bPartnerDto } from './create-b2b-partner.dto';

export class UpdateB2bPartnerDto extends PartialType(CreateB2bPartnerDto) {}
