import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreatedAtToUser1768472435372 implements MigrationInterface {
    name = 'AddCreatedAtToUser1768472435372'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "created_at"`);
    }

}
