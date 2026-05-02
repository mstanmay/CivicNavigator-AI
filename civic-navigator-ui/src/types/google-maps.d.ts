// Augment the global scope with Google Maps types
// Install @types/google.maps if you want full type safety:
// npm install --save-dev @types/google.maps

declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options?: MapOptions);
      setCenter(center: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      panTo(latLng: LatLng | LatLngLiteral): void;
    }
    class Marker {
      constructor(options?: MarkerOptions);
      addListener(event: string, handler: () => void): void;
      setAnimation(animation: Animation | null): void;
      setMap(map: Map | null): void;
      getPosition(): LatLng;
    }
    class DirectionsService {
      route(
        request: DirectionsRequest,
        callback: (
          result: DirectionsResult,
          status: DirectionsStatus
        ) => void
      ): void;
    }
    class DirectionsRenderer {
      constructor(options?: DirectionsRendererOptions);
      setMap(map: Map | null): void;
      setDirections(directions: DirectionsResult | { routes: [] }): void;
    }
    class TrafficLayer {
      setMap(map: Map | null): void;
    }
    class LatLngBounds {
      extend(point: LatLng | LatLngLiteral): void;
    }
    class LatLng {
      lat(): number;
      lng(): number;
    }
    class Size {
      constructor(width: number, height: number);
    }
    class Point {
      constructor(x: number, y: number);
    }
    enum Animation {
      DROP,
      BOUNCE,
    }
    enum TravelMode {
      DRIVING,
      WALKING,
      BICYCLING,
      TRANSIT,
    }
    enum ControlPosition {
      RIGHT_CENTER,
      TOP_LEFT,
      TOP_RIGHT,
      BOTTOM_LEFT,
      BOTTOM_RIGHT,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type DirectionsStatus = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type DirectionsResult = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type DirectionsRequest = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type DirectionsRendererOptions = any;
    interface MapOptions {
      center?: LatLngLiteral;
      zoom?: number;
      disableDefaultUI?: boolean;
      zoomControl?: boolean;
      zoomControlOptions?: { position?: ControlPosition };
      gestureHandling?: string;
      styles?: MapTypeStyle[];
    }
    interface MarkerOptions {
      position?: LatLngLiteral;
      map?: Map;
      title?: string;
      animation?: Animation;
      icon?: {
        url?: string;
        scaledSize?: Size;
        anchor?: Point;
        path?: SymbolPath;
        scale?: number;
        fillColor?: string;
        fillOpacity?: number;
        strokeColor?: string;
        strokeWeight?: number;
      };
    }
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    interface MapTypeStyle {
      featureType?: string;
      elementType?: string;
      stylers: Array<Record<string, string | number>>;
    }
    enum SymbolPath {
      CIRCLE,
      FORWARD_CLOSED_ARROW,
      FORWARD_OPEN_ARROW,
      BACKWARD_CLOSED_ARROW,
      BACKWARD_OPEN_ARROW,
    }
  }
}
