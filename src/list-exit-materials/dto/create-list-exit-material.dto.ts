import { IsString, MinLength, IsNumber, IsPositive, IsBoolean, IsOptional, IsUUID, IsArray } from "class-validator";

export class CreateListExitMaterialDto {

    @IsOptional()
    id?: string;

    @IsString({message:'El nombre debe ser texto'})
  @MinLength(2,{message:'El nombre debe tener mas de 2 caracteres'}) 
  nameList:string;

  @IsArray()  
   details:CreateDetailsMaterialsDto[];
  
}


export class CreateDetailsMaterialsDto {

    @IsOptional()
    id?: string;

    @IsString() 
    @IsUUID()
    materialId?: string;
  
  }
