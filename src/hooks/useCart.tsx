import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });


  useEffect(() => {
    const newCart = localStorage.getItem('@RocketShoes:cart')
    if (newCart) {
      setCart(JSON.parse(newCart))
    }

  }, [])

  // useEffect(() => {
  //   localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
  // }, [cart])

  const addProduct = async (productId: number) => {
    try {
      const stocks: Stock[] = await api.get('/stock').then(response => response.data).catch(error => console.log(error))
      const addedProduct = cart.find(product => product.id === productId)
      const addedProductStock = stocks.find(product => product.id === productId)
      const addedProductIsValid = stocks.findIndex(product => product.id === productId) !== -1
      if (addedProductIsValid) {
        if (addedProduct && addedProductStock) {
          if (addedProduct.amount < addedProductStock.amount) {
            const newCart = cart.map(product => {
              if (product.id === productId) {
                return { ...product, amount: (product.amount + 1) }
              } else {
                return product
              }
            })
            setCart(newCart)
            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
          } else {
            toast.error('Quantidade solicitada fora de estoque');
          }
        } else {
          await api.get('/products').then(response => {
            const products: Product[] = response.data
            const newProduct = products.find(product => product.id === productId)
            if (newProduct) {
              const newCart = [...cart, { ...newProduct, amount: 1 }]
              setCart(newCart)
              localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
            }
          }).catch(error => console.log(error))
        }
      } else {
        toast.error('Erro na adição do produto')
      }
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(product => product.id !== productId)
      setCart(newCart)
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const newCart = cart.map(product => product.id === productId ? { ...product, amount: amount } : product)
      setCart(newCart)
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={ { cart, addProduct, removeProduct, updateProductAmount } }
    >
      { children }
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
