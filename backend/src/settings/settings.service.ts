import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePricingDto } from './dto/update-pricing.dto';

const SINGLETON_ID = 'default';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Always returns a row — creates defaults on first call. */
  async getPricing() {
    const existing = await this.prisma.pricingSettings.findUnique({
      where: { id: SINGLETON_ID },
    });
    if (existing) return existing;
    return this.prisma.pricingSettings.create({ data: { id: SINGLETON_ID } });
  }

  async updatePricing(dto: UpdatePricingDto) {
    await this.getPricing();
    return this.prisma.pricingSettings.update({
      where: { id: SINGLETON_ID },
      data: { ...dto },
    });
  }

  /** Returns company identity and bank details for invoices and vouchers. */
  async getCompanyProfile() {
    const existing = await this.prisma.companyProfile.findUnique({
      where: { id: SINGLETON_ID },
    });
    if (existing) return existing;
    return this.prisma.companyProfile.create({ data: { id: SINGLETON_ID } });
  }

  async updateCompanyProfile(data: any) {
    await this.getCompanyProfile();
    return this.prisma.companyProfile.update({
      where: { id: SINGLETON_ID },
      data: {
        legalName: data.legalName,
        brandName: data.brandName,
        gstin: data.gstin,
        pan: data.pan,
        address: data.address,
        city: data.city,
        state: data.state,
        stateCode: data.stateCode,
        pincode: data.pincode,
        phone: data.phone,
        email: data.email,
        website: data.website,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        accountHolder: data.accountHolder,
        upiId: data.upiId,
      },
    });
  }
}
