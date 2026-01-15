import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateExampleDto } from './dto/create-example.dto';
import { Example } from '../../database/entities/example.entity';

@Injectable()
export class ExampleService {
  constructor(
    @InjectRepository(Example)
    private readonly exampleRepository: Repository<Example>,
  ) {}

  async create(createExampleDto: CreateExampleDto): Promise<Example> {
    const entity = this.exampleRepository.create({
      name: createExampleDto.name,
      description: createExampleDto.description ?? null,
      isActive: createExampleDto.isActive ?? true,
    });
    return this.exampleRepository.save(entity);
  }

  async findAll(): Promise<Example[]> {
    return this.exampleRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Example> {
    const example = await this.exampleRepository.findOne({
      where: { id },
    });

    if (!example) {
      throw new NotFoundException('Example not found');
    }

    return example;
  }
}

