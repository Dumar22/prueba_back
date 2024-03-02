import { PartialType } from '@nestjs/mapped-types';
import { CreateProyectDto } from './create-proyect.dto';
import { Type } from 'class-transformer';
import { IsString, MinLength, IsDate, IsOptional } from 'class-validator';

export class UpdateProyectDto extends PartialType(CreateProyectDto) {


    @IsString({message:'El nombre debe ser texto'})
    @MinLength(2,{message:'El nombre debe tener mas de 2 caracteres'}) 
    name:string;
  
    @IsDate()
    @Type(() => Date)
    initialize: Date
  
    @IsString({message:'El nombre debe ser texto'})
    @IsOptional()
    obs?:string;
}
