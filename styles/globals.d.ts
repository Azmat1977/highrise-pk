// types/globals.d.ts
// Highrise.pk — ambient module declarations for non-TS imports
// Allows CSS, SCSS, image, and font imports as side-effects or modules

// CSS / SCSS modules and side-effect imports
declare module '*.css';
declare module '*.scss';
declare module '*.sass';

// CSS modules (typed)
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
declare module '*.module.scss' {
  const classes: Record<string, string>;
  export default classes;
}

// Image imports
declare module '*.svg' {
  const content: string;
  export default content;
}
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.webp';
declare module '*.avif';
declare module '*.ico';
declare module '*.bmp';

// Font imports
declare module '*.woff';
declare module '*.woff2';
declare module '*.ttf';
declare module '*.otf';
declare module '*.eot';