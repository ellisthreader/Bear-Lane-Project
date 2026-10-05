export interface ClipartItem {
  id: string;
  src: string;
  label: string;
}

export interface ClipartCategoryType {
  id: string;
  name: string;
  items: ClipartItem[];
}
