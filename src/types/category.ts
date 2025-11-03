export interface Category {
  id: number;
  name: string;
  icon: string;
  emoji?: string; // Alias for backwards compatibility
}

export interface CategoryFormData {
  name: string;
  emoji?: string;
  icon: string;
}
