export interface ViewerImage {
  id: string;
  url: string;
  alt?: string;
}

export interface OpenViewerPayload {
  images: ViewerImage[];
  initialIndex?: number;
}
