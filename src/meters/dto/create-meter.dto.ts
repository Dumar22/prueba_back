import { IsBoolean, IsIn, IsNumber, IsOptional, IsPositive, IsString, MinLength } from "class-validator";


export class CreateMeterDto {

    @IsString({message:'El nombre debe ser texto'})
    @MinLength(2,{message:'El nombre debe tener mas de 2 caracteres'}) 
    name:string;
  
    @IsString()
    @MinLength(2)
    code:string;

    @IsString()
    @MinLength(2)
    serial:string;
    
    @IsString()
    @MinLength(2)
    brand:string;
  
    @IsIn(['UNIDAD']) 
    unity:string;
  
    @IsNumber()
    @IsPositive()
    quantity:number;
  
    @IsNumber()
    @IsPositive()
    price:number;
  
    @IsBoolean()
    @IsOptional()
    available?:boolean;
  
    @IsString()
    @IsOptional()
    observation?:string;

}

