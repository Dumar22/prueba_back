import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Material } from 'src/materials/entities/material.entity';
import { AssignmentPeAlPe } from './assignment-pe-al-pe.entity';

@Entity()
export class AssignmentDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;  

  @ManyToOne(() => Material,
   material => material.materialAssignment,
   {eager: true})
  material: Material;
  
   @Column('int',{ default:0, nullable: false })
    assignedQuantity: number;  

   @Column('float',{ default:0, nullable: false })
    used: number;     

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  returnedAt: Date;  

  @Column({default:false, nullable: false })
  returnMaterials: boolean;

  @Column('float', { default: 0, nullable: false })
  total: number;

  @ManyToOne(() => AssignmentPeAlPe,
  assignmentDetails => assignmentDetails.details,
   )
   assignmentDetails: AssignmentPeAlPe;

   @BeforeInsert()
    insertTotal(){     
      this.total = this.assignedQuantity * this.material.price
   }


   @BeforeUpdate()
   insert(){     
    this.total = this.assignedQuantity * this.material.price
 }
}