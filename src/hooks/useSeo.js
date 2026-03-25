import { useEffect } from 'react'

const SITE_NAME = 'Kassa'
const DEFAULT_PRODUCTION_URL = 'https://quickcashier.ru'
const DEFAULT_DESCRIPTION =
  'Kassa is a web POS app for cafes and small businesses with menu, checks, rooms, and admin tools.'
const DEFAULT_SITE_URL = (import.meta.env.VITE_SITE_URL || DEFAULT_PRODUCTION_URL)
  .trim()
  .replace(/\/+$/, '')

const ensureMeta = (selector, attrs) => {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    Object.entries(attrs).forEach(([key, value]) => {
      element.setAttribute(key, value)
    })
    document.head.appendChild(element)
  }
  return element
}

const ensureCanonical = () => {
  let link = document.head.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  return link
}

const getBaseUrl = () => {
  if (DEFAULT_SITE_URL) return DEFAULT_SITE_URL
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

const getSeoByRoute = (pathname, isAuthed) => {
  if (pathname === '/admin') {
    return {
      title: `Admin panel | ${SITE_NAME}`,
      description:
        'Kassa admin area for menu and category management. Available only for admin or owner users.',
      robots: 'noindex, nofollow',
    }
  }

  if (pathname === '/') {
    if (isAuthed) {
      return {
        title: `Kassa - cashier workspace`,
        description:
          'Cashier workspace with checks, menu search, room management, and fast order processing.',
        robots: 'index, follow',
      }
    }

    return {
      title: `Kassa - sign in`,
      description:
        'Sign in to Kassa, a web POS app with menu management, checks, rooms, and admin panel.',
      robots: 'index, follow',
    }
  }

  return {
    title: `${SITE_NAME} - web POS`,
    description: DEFAULT_DESCRIPTION,
    robots: 'noindex, follow',
  }
}

export const useSeo = ({ pathname, isAuthed }) => {
  useEffect(() => {
    const seo = getSeoByRoute(pathname, isAuthed)
    const baseUrl = getBaseUrl()
    const canonicalUrl = `${baseUrl}${pathname || '/'}`

    document.title = seo.title

    ensureMeta('meta[name="description"]', { name: 'description' }).setAttribute(
      'content',
      seo.description,
    )
    ensureMeta('meta[name="robots"]', { name: 'robots' }).setAttribute('content', seo.robots)
    ensureMeta('meta[name="googlebot"]', { name: 'googlebot' }).setAttribute('content', seo.robots)

    ensureMeta('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', 'website')
    ensureMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', seo.title)
    ensureMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute(
      'content',
      seo.description,
    )
    ensureMeta('meta[property="og:url"]', { property: 'og:url' }).setAttribute('content', canonicalUrl)

    ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card' }).setAttribute(
      'content',
      'summary_large_image',
    )
    ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title' }).setAttribute(
      'content',
      seo.title,
    )
    ensureMeta('meta[name="twitter:description"]', {
      name: 'twitter:description',
    }).setAttribute('content', seo.description)

    ensureCanonical().setAttribute('href', canonicalUrl)
  }, [pathname, isAuthed])
}
