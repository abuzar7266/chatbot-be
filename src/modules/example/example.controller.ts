import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { ExampleService } from './example.service';
import { CreateExampleDto } from './dto/create-example.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Example')
@Controller('example')
@UseGuards(ThrottlerGuard)
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60)
  @ApiOperation({ summary: 'Get all examples' })
  @ApiResponse({ status: 200, description: 'List of examples' })
  findAll() {
    return this.exampleService.findAll();
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('example')
  @CacheTTL(60)
  @ApiOperation({ summary: 'Get example by ID' })
  @ApiResponse({ status: 200, description: 'Example found' })
  @ApiResponse({ status: 404, description: 'Example not found' })
  findOne(@Param('id') id: string) {
    return this.exampleService.findOne(id);
  }

  @Post()
  @Auth(['admin'])
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Create a new example' })
  @ApiResponse({ status: 201, description: 'Example created' })
  create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
  }
}
