export type EquipmentType = 'lawn' | '2cycle' | 'other';
export type WorkOrderStatus = 'completed' | 'warranty' | 'nwf' | 'review' | 'inprogress';

export interface WorkOrder {
  id: string;
  customerId: string;
  customer: string;
  tag: string;
  inDate: string;
  startDate: string | null;
  complDate: string | null;
  outDate: string | null;
  mfr: string;
  model: string;
  desc: string;
  serial: string;
  type: EquipmentType;
  status: WorkOrderStatus;
  comments: string;
}
