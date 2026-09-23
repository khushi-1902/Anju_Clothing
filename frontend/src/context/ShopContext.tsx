import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Product, CartItem, PageType, ShopUser, SignupPayload } from '../types'
import { PRODUCTS } from '../data/products'

const USERS_KEY = 'anju_users'
const SESSION_KEY = 'anju_session'

interface StoredUser extends ShopUser {
  password: string
}

function readUsers(): StoredUser[] {
  try {
    const saved = localStorage.getItem(USERS_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function readSession(): ShopUser | null {
  try {
    const saved = localStorage.getItem(SESSION_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

interface ShopContextType {
  // Navigation & Routing
  currentPage: PageType
  selectedProductId: string | null
  selectedCategory: string | null
  searchQuery: string
  setSearchQuery: (query: string) => void
  navigateTo: (page: PageType, productId?: string, categorySlug?: string) => void

  // Account
  currentUser: ShopUser | null
  login: (email: string, password: string) => { ok: boolean; error?: string }
  signup: (payload: SignupPayload) => { ok: boolean; error?: string }
  logout: () => void
  requestPasswordReset: (email: string) => { ok: boolean; error?: string }
  
  // Cart
  cart: CartItem[]
  addToCart: (product: Product, selectedSize?: string, quantity?: number) => void
  removeFromCart: (productId: string, selectedSize: string) => void
  updateQuantity: (productId: string, selectedSize: string, delta: number) => void
  clearCart: () => void
  cartCount: number
  cartSubtotal: number
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
  openCart: () => void
  closeCart: () => void

  // Wishlist
  wishlist: string[]
  toggleWishlist: (productId: string) => void
  isInWishlist: (productId: string) => boolean
  wishlistCount: number
  isWishlistOpen: boolean
  setIsWishlistOpen: (open: boolean) => void
  openWishlist: () => void
  closeWishlist: () => void

  // Quick View Modal
  quickViewProduct: Product | null
  setQuickViewProduct: (product: Product | null) => void

  // Helper product finder
  selectedProduct: Product | undefined
}

const ShopContext = createContext<ShopContextType | undefined>(undefined)

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()

  const currentPage: PageType = (() => {
    const path = location.pathname
    if (path.startsWith('/all-products') || path.startsWith('/category')) return 'all-products'
    if (path.startsWith('/bestsellers')) return 'bestsellers'
    if (path.startsWith('/product')) return 'product-detail'
    if (path.startsWith('/contact')) return 'contact'
    if (path.startsWith('/sign-in') || path.startsWith('/login')) return 'login'
    if (path.startsWith('/sign-up') || path.startsWith('/signup')) return 'signup'
    if (path.startsWith('/account')) return 'account'
    return 'home'
  })()

  const extractProductId = (pathname: string) => {
    const match = pathname.match(/^\/product\/([^/?#]+)/)
    return match ? match[1] : null
  }

  const [selectedProductId, setSelectedProductId] = useState<string | null>(() => extractProductId(location.pathname))
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const prodId = extractProductId(location.pathname)
    if (prodId) {
      setSelectedProductId(prodId)
    }
  }, [location.pathname])

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('anju_cart')
      return saved ? JSON.parse(saved) : [
        { product: PRODUCTS[0], quantity: 1, selectedSize: 'M' },
        { product: PRODUCTS[4], quantity: 1, selectedSize: 'Free Size' }
      ]
    } catch {
      return []
    }
  })

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('anju_wishlist')
      return saved ? JSON.parse(saved) : ['prod-1', 'prod-3']
    } catch {
      return []
    }
  })

  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isWishlistOpen, setIsWishlistOpen] = useState(false)
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)
  const [currentUser, setCurrentUser] = useState<ShopUser | null>(() => readSession())

  useEffect(() => {
    try {
      localStorage.setItem('anju_cart', JSON.stringify(cart))
    } catch {
      // ignore storage errors
    }
  }, [cart])

  useEffect(() => {
    try {
      localStorage.setItem('anju_wishlist', JSON.stringify(wishlist))
    } catch {
      // ignore storage errors
    }
  }, [wishlist])

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname, location.search])

  const navigateTo = (page: PageType, productId?: string, categorySlug?: string) => {
    setIsCartOpen(false)
    setIsWishlistOpen(false)
    setQuickViewProduct(null)

    if (productId) setSelectedProductId(productId)
    if (categorySlug !== undefined) setSelectedCategory(categorySlug)

    switch (page) {
      case 'home':
        navigate('/')
        break
      case 'all-products':
        if (categorySlug) {
          navigate(`/category/${encodeURIComponent(categorySlug)}`)
        } else {
          navigate('/all-products')
        }
        break
      case 'bestsellers':
        navigate('/bestsellers')
        break
      case 'product-detail':
        navigate(`/product/${productId || selectedProductId || PRODUCTS[0].id}`)
        break
      case 'contact':
        navigate('/contact')
        break
      case 'login':
        navigate('/sign-in')
        break
      case 'signup':
        navigate('/sign-up')
        break
      case 'account':
        navigate('/account')
        break
      default:
        navigate('/')
    }
  }

  const addToCart = (product: Product, selectedSize?: string, quantity: number = 1) => {
    const size = selectedSize || product.sizes?.[0] || 'Standard'
    setCart(prev => {
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id && item.selectedSize === size
      )
      if (existingIndex > -1) {
        const next = [...prev]
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity
        }
        return next
      }
      return [...prev, { product, quantity, selectedSize: size }]
    })
    setIsCartOpen(true)
  }

  const removeFromCart = (productId: string, selectedSize: string) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.selectedSize === selectedSize)))
  }

  const updateQuantity = (productId: string, selectedSize: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId && item.selectedSize === selectedSize) {
            const newQty = item.quantity + delta
            return newQty > 0 ? { ...item, quantity: newQty } : null
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    })
  }

  const clearCart = () => {
    setCart([])
  }

  const toggleWishlist = (productId: string) => {
    setWishlist(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    )
  }

  const isInWishlist = (productId: string) => wishlist.includes(productId)

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const cartSubtotal = cart.reduce((total, item) => total + item.product.price * item.quantity, 0)
  const wishlistCount = wishlist.length

  const openCart = () => {
    setIsWishlistOpen(false)
    setIsCartOpen(true)
  }

  const closeCart = () => setIsCartOpen(false)

  const openWishlist = () => {
    setIsCartOpen(false)
    setIsWishlistOpen(true)
  }

  const closeWishlist = () => setIsWishlistOpen(false)

  const login = (email: string, password: string) => {
    const users = readUsers()
    const match = users.find(
      user => user.email.toLowerCase() === email.trim().toLowerCase() && user.password === password
    )
    if (!match) {
      return { ok: false, error: 'Email or password is incorrect. Please try again.' }
    }
    const session: ShopUser = {
      firstName: match.firstName,
      lastName: match.lastName,
      email: match.email,
      phone: match.phone,
    }
    setCurrentUser(session)
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return { ok: true }
  }

  const signup = (payload: SignupPayload) => {
    const users = readUsers()
    const email = payload.email.trim().toLowerCase()
    if (users.some(user => user.email.toLowerCase() === email)) {
      return { ok: false, error: 'An account with this email already exists. Please log in.' }
    }
    const stored: StoredUser = {
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email,
      phone: payload.phone.trim(),
      password: payload.password,
    }
    writeUsers([...users, stored])
    const session: ShopUser = {
      firstName: stored.firstName,
      lastName: stored.lastName,
      email: stored.email,
      phone: stored.phone,
    }
    setCurrentUser(session)
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return { ok: true }
  }

  const logout = () => {
    setCurrentUser(null)
    localStorage.removeItem(SESSION_KEY)
  }

  const requestPasswordReset = (email: string) => {
    const users = readUsers()
    const exists = users.some(user => user.email.toLowerCase() === email.trim().toLowerCase())
    if (!exists) {
      return { ok: false, error: 'We could not find an account with that email.' }
    }
    return { ok: true }
  }

  const selectedProduct = selectedProductId
    ? PRODUCTS.find(p => p.id === selectedProductId)
    : undefined

  return (
    <ShopContext.Provider
      value={{
        currentPage,
        selectedProductId,
        selectedCategory,
        searchQuery,
        setSearchQuery,
        navigateTo,
        currentUser,
        login,
        signup,
        logout,
        requestPasswordReset,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartSubtotal,
        isCartOpen,
        setIsCartOpen,
        openCart,
        closeCart,
        wishlist,
        toggleWishlist,
        isInWishlist,
        wishlistCount,
        isWishlistOpen,
        setIsWishlistOpen,
        openWishlist,
        closeWishlist,
        quickViewProduct,
        setQuickViewProduct,
        selectedProduct,
      }}
    >
      {children}
    </ShopContext.Provider>
  )
}

export function useShop() {
  const context = useContext(ShopContext)
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider')
  }
  return context
}
