import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Contract } from './entities/contract.entity';
import { Like, Repository } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { isUUID } from 'class-validator';
import { FileUploadService } from 'src/upload-xls/upload-xls.service';

@Injectable()
export class ContractService {

  private readonly logger = new Logger('ContractService')

  constructor(   
    @InjectRepository( Contract)
    private readonly contractsRepository: Repository<Contract>,
    private readonly fileUploadService: FileUploadService
  ){}

  async create(createContractDto: CreateContractDto, user: User) {

     // Obtener el número de salida para la bodega actual
  const lastExitNumber = await this.getLastExitNumberForUser(user.warehouses[0].id);

    const existingContract = await this.contractsRepository.createQueryBuilder('contract')
    .where('contract.request = :request AND warehouseId = :warehouseId', { 
      contract: createContractDto.request, 
      warehouseId: user.warehouses[0].id  
    })
    .getOne();
  
      if (existingContract) {
        throw new BadRequestException(`El Contrato con solicitud ${createContractDto.request} ya existe en la bodega ${user.warehouses[0].name}.`);
      }

    try {   

       const contract = this.contractsRepository.create({
       ...createContractDto,
       contractNumber: lastExitNumber + 1,
       user, 
       warehouse: user.warehouses[0]
        
      });

     await this.contractsRepository.save(contract);

      return {message:'Contrato creado'}
      
    } catch (error) {          
      console.log(error); 
      this.handleDBExeptions(error)
    }
   

  }

  private async getLastExitNumberForUser(warehouseId: string): Promise<number> {
    const lastExit = await this.contractsRepository.findOne({
      where: { warehouse: {id: warehouseId} },
      order: { contractNumber: 'DESC' },
    });
  
    return lastExit ? lastExit.contractNumber : 0;
  }

  async createxls(fileBuffer: Buffer, createContractDto: CreateContractDto, user: User) {
    try {
      // Obtener el número de salida para la bodega actual
      const lastExitNumber = await this.getLastExitNumberForUser(user.warehouses[0].id);
  
      // Lógica para procesar el archivo Excel y obtener la lista de contratos
      let contracts = await this.fileUploadService.processExcel(fileBuffer, this.contractsRepository, (entry: CreateContractDto) => {
        return this.contractDataFormat(entry, user);
      });   
  
      // Ordenar los contratos por número de contrato de forma descendente
      contracts = contracts.sort((a, b) => b.contractNumber - a.contractNumber);
  
      // Lista de contratos que no fueron cargados
      const failedContracts: { contract: CreateContractDto; reason: string }[] = [];
  
      for (const contract of contracts) {
        const existingContract = await this.contractsRepository.createQueryBuilder()
          .where('request = :request AND warehouseId = :warehouseId', {  
            contract: contract.request,
            warehouseId: user.warehouses[0].id  
          })
          .getOne();
        
        if (existingContract) {
          failedContracts.push({ 
            contract, 
            reason: `El Contrato con órden de trabajo ${contract.request} ya existe en la bodega ${user.warehouses[0].name}.` 
          });    
        } else {    
          // Guardar el Contrato solo si no existe
          await this.contractsRepository.save(contract);     
        }
      }
  
      return { contracts,  failedContracts, message: 'Contratos creados' };
    } catch (error) {
      // Manejar las excepciones de la base de datos
      this.handleDBExeptions(error);
    }
  }
  
  
  private contractDataFormat(entry: CreateContractDto, user: User): Contract {
    return this.contractsRepository.create({
      ...entry,
      user,
      warehouse: user.warehouses[0],
    });
  }


  async findAll(paginationDto: PaginationDto, user: User) {
    // const { limit = 10, offset = 0 } = paginationDto;
  
    let contractsQuery = this.contractsRepository.createQueryBuilder('contract')
      .leftJoinAndSelect('contract.user', 'user')
      .leftJoinAndSelect('contract.warehouse', 'warehouse');
  
    if (!user.rol.includes('admin')) {
      // Si no es administrador, aplicar restricciones por bodega
      contractsQuery = contractsQuery
        .andWhere('warehouse.id IN (:...warehouseIds)', { warehouseIds: user.warehouses.map(warehouse => warehouse.id) });
    }
    // Agrega la condición para excluir las erramientas eliminados
      contractsQuery = contractsQuery.andWhere('contract.deletedAt IS NULL');
  
    const contract = await contractsQuery
      // .skip(offset)
      // .take(limit)
      .getMany();
  
    return contract
  }

 async findOne(term: string, user: User) {
   
   let contract: Contract;
     if (isUUID(term)) {
      contract = await this.contractsRepository.findOneBy({id: term});
     }else{      
      const queryBuilder = this.contractsRepository.createQueryBuilder();
      contract = await queryBuilder
       .where('UPPER(name) =:name or contract =:contract',{
        name: term.toUpperCase(),
        contract: term,
       }).getOne();
    }    
    if (!contract)
      throw new NotFoundException(`Contarto no encontrado.`);

      return contract;
  }  

  
  async searchContract(term: string, user: User) {
    let data = await this.contractsRepository.find({
      where: [
        { name: Like(`%${term}%`) },
        { contract: Like(`%${term}%`) },
        { request: Like(`%${term}%`) },
        { addres: Like(`%${term}%`) },
      ],
    });
    return data;
  }
  
 async update(id: string, updateContractDto: UpdateContractDto, user: User) {
   
    const contract = await this.contractsRepository.preload({
      id: id,
      ...updateContractDto
    });
      
    const existingContract = await this.contractsRepository.createQueryBuilder('contract')
    .where('(LOWER(contract.contract) = LOWER(:contract) OR contract.request = :request) AND contract.warehouseId = :warehouseId', {
      contract: updateContractDto.contract,
      request: updateContractDto.request,
      warehouseId: user.warehouses[0].id,
    })
    .andWhere('contract.id != :contractId', { contractId: id })
    .getOne();

  if (existingContract && (existingContract.contract !== contract.contract || existingContract.request !== contract.request)) {
    throw new BadRequestException(`El contrato con solicitud de trabajo ${updateContractDto.request} ya existe en la bodega ${user.warehouses[0].name}.`);
  }   
        try {
          await this.contractsRepository.save(contract);
          return {Message:'Contrato actualizado con exito'};
   
        } catch (error) {
          this.handleDBExeptions(error)
        }
  }

  async remove(id: string, user: User) {

    const contract = await this.contractsRepository.findOneBy({id: id});

  if (contract) {
    contract.deletedBy = user.id;
    contract.deletedAt = new Date();

    await this.contractsRepository.save(contract);
    // const material = await this.findOne( id );
    //await this.materialsRepository.delete({ id });
    return {message:'Contrato eliminado.'}
  }else{
    throw new NotFoundException(`El contrato no fue encontrado.`);
  }
}


  private handleDBExeptions(error: any){    

    if (error.code === 'ER_DUP_ENTRY') {
      throw new BadRequestException('El contrato con orden de trabajo ingresada ya existe.');
    }

       this.logger.error(error);
            
      throw new InternalServerErrorException('Unexpected error, check server logs');
  }
}
