import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { SocialService, CreateSocialPostDto, UpdateSocialPostDto } from './social.service';
import { GenerateCopyDto } from './ai-generator.service';
import { SocialPlatform, SocialPostStatus, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Actor } from '../common/access';

const SOCIAL_ROLES: Role[] = [Role.OWNER, Role.SUPER_ADMIN, Role.MARKETING, Role.SALES_MANAGER];

@Roles(...SOCIAL_ROLES)
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  // ─── AI Copy Generator ──────────────────────────────────────────────────────

  @Post('generate')
  async generateCopy(@Body() dto: GenerateCopyDto) {
    return this.socialService.generateCopy(dto);
  }

  // ─── Social Accounts ────────────────────────────────────────────────────────

  @Get('accounts')
  async listAccounts() {
    return this.socialService.listAccounts();
  }

  @Post('accounts')
  async connectAccount(@Body() body: any) {
    return this.socialService.connectAccount(body);
  }

  @Delete('accounts/:id')
  async disconnectAccount(@Param('id') id: string) {
    return this.socialService.disconnectAccount(id);
  }

  // ─── Posts CRUD ─────────────────────────────────────────────────────────────

  @Post('posts')
  async createPost(@Body() dto: CreateSocialPostDto, @CurrentUser() actor: Actor) {
    return this.socialService.createPost(dto, actor.id);
  }

  @Get('posts')
  async listPosts(
    @Query('platform') platform?: SocialPlatform,
    @Query('status') status?: SocialPostStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit = 30,
  ) {
    return this.socialService.listPosts({ platform, status, page, limit });
  }

  @Get('posts/:id')
  async getPost(@Param('id') id: string) {
    return this.socialService.getPost(id);
  }

  @Patch('posts/:id')
  async updatePost(
    @Param('id') id: string,
    @Body() dto: UpdateSocialPostDto,
  ) {
    return this.socialService.updatePost(id, dto);
  }

  @Delete('posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(@Param('id') id: string) {
    await this.socialService.deletePost(id);
  }

  @Post('posts/:id/publish')
  async publishNow(@Param('id') id: string) {
    return this.socialService.publishNow(id);
  }

  // ─── Calendar ───────────────────────────────────────────────────────────────

  @Get('calendar')
  async getCalendar(
    @Query('month', new DefaultValuePipe(new Date().getMonth() + 1), ParseIntPipe) month = new Date().getMonth() + 1,
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year = new Date().getFullYear(),
  ) {
    return this.socialService.getCalendar(month, year);
  }

  // ─── Analytics ──────────────────────────────────────────────────────────────

  @Get('analytics')
  async getAnalytics() {
    return this.socialService.getAnalytics();
  }

  // ─── Trends ─────────────────────────────────────────────────────────────────

  @Get('trends')
  async getTrends() {
    return this.socialService.getTrends();
  }
}
