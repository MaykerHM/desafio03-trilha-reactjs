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

  const [stocks, setStocks] = useState<Stock[]>([])


  useEffect(() => {
    const newCart = localStorage.getItem('@RocketShoes:cart')
    if (newCart) {
      setCart(JSON.parse(newCart))
    }
    api.get<Stock[]>('/stock').then(response => setStocks(response.data)).catch(error => console.log(error))

  }, [])

  const addProduct = async (productId: number) => {
    try {
      const { data: addedProductStock } = await api.get<Stock>(`/stock/${productId}`)
      const { data: addedProduct } = await api.get<Product>(`/products/${productId}`)
      const alreadyInCartProduct = cart.find(product => product.id === productId)
      const isValidProduct = addedProduct !== null

      console.log(addedProductStock)
      console.log(alreadyInCartProduct)

      if (isValidProduct) {
        if (!alreadyInCartProduct) {
          const newCart = [...cart, { ...addedProduct, amount: 1 }]
          setCart(newCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
        } else {
          if (alreadyInCartProduct.amount < addedProductStock.amount) {
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
      const addedProductIsValid = stocks.findIndex(product => product.id === productId) !== -1
      if (addedProductIsValid) {
        const newCart = cart.filter(product => product.id !== productId)
        setCart(newCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      } else {
        toast.error('Erro na remoção do produto')
      }
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const addedProductIsValid = stocks.findIndex(product => product.id === productId) !== -1
      const addedProductStock = stocks.find(product => product.id === productId)
      if (addedProductStock && addedProductIsValid) {
        if (amount <= addedProductStock.amount && amount >= 1) {

          const newCart = cart.map(product => product.id === productId ? { ...product, amount: amount } : product)
          setCart(newCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      } else {
        toast.error('Erro na alteração de quantidade do produto')
      }
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
