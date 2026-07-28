//C:\dev\highrise-pk\pages\_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content="Highrise.pk - Elevating Real Estate in Pakistan. Find premium properties, apartments, plots, and shops across Pakistan." />
        <meta name="keywords" content="real estate, property, apartments, plots, shops, pakistan, lahore, karachi, islamabad" />
        <meta name="author" content="Highrise.pk" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Highrise.pk - Elevating Real Estate in Pakistan" />
        <meta property="og:description" content="Discover premium properties across Pakistan. Buy, rent, or invest in apartments, plots, and shops with trusted developers." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://highrise.pk" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Highrise.pk - Elevating Real Estate in Pakistan" />
        <meta name="twitter:description" content="Discover premium properties across Pakistan." />
        
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
               <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        
        {/* Cloudflare Turnstile CAPTCHA is loaded only on pages that need it */}
        {/* Removed global load to prevent duplicate script warnings */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
