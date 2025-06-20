import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const useCartStore = create((set, get) => ({
  cart: { items: [], totalAmount: 0 },

  setCart: async (cart) => {
    set({ cart });
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving cart to AsyncStorage:', error);
    }
  },

  addToCart: async (newItem) => {
    try {
      console.log('Cart store received item:', newItem);

      if (!newItem || !newItem._id || typeof newItem.price !== 'number') {
        console.error('Invalid item data:', newItem);
        throw new Error('Invalid item data');
      }

      const state = get();
      const existingItemIndex = state.cart.items.findIndex(
        item => item.productId._id === newItem._id && item.size === newItem.size
      );

      let updatedItems;
      if (existingItemIndex >= 0) {
        // Update existing item
        updatedItems = [...state.cart.items];
        updatedItems[existingItemIndex].quantity += newItem.quantity || 1;
      } else {
        // Add new item
        const cartItem = {
          productId: {
            _id: newItem._id,
            name: newItem.name,
            price: newItem.price,
            image: newItem.image,
            category: newItem.category,
            color: newItem.color,
            size: newItem.size,
            stock: newItem.stock
          },
          quantity: newItem.quantity || 1,
          size: newItem.size,
          price: newItem.price
        };
        updatedItems = [...state.cart.items, cartItem];
      }

      const totalAmount = updatedItems.reduce(
        (total, item) => total + (item.price * item.quantity),
        0
      );

      const updatedCart = {
        items: updatedItems,
        totalAmount
      };

      console.log('Updated cart:', updatedCart);

      // Update local state
      set({ cart: updatedCart });

      // Save to AsyncStorage
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));

      // Sync with server if user is logged in
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        try {
          const response = await axios.post('http://172.20.10.2:4000/api/user/add_to_cart', {
            productId: newItem._id,
            quantity: newItem.quantity || 1,
            size: newItem.size
          }, {
            headers: {
              Authorization: `Bearer ${userToken}`
            }
          });

          if (!response.data.success) {
            console.error('Server returned error:', response.data.message);
            // Revert local changes if server sync fails
            const storedCart = await AsyncStorage.getItem('cart');
            if (storedCart) {
              const parsedCart = JSON.parse(storedCart);
              set({ cart: parsedCart });
            }
            throw new Error(response.data.message || 'Failed to sync with server');
          }

          console.log('Successfully synced cart with server');
        } catch (error) {
          console.error('Error syncing cart with server:', error.response?.data || error.message);
          // Revert local changes if server sync fails
          const storedCart = await AsyncStorage.getItem('cart');
          if (storedCart) {
            const parsedCart = JSON.parse(storedCart);
            set({ cart: parsedCart });
          }
          throw error;
        }
      }

      return true; // Indicate success
    } catch (error) {
      console.error('Error in addToCart:', error);
      throw error; // Propagate error to caller
    }
  },

  removeFromCart: async (productId, size) => {
    try {
      const state = get();
      const updatedItems = state.cart.items.filter(
        item => !(item.productId._id === productId && item.size === size)
      );

      const totalAmount = updatedItems.reduce(
        (total, item) => total + (item.price * item.quantity),
        0
      );

      const updatedCart = {
        items: updatedItems,
        totalAmount
      };

      // Update local state
      set({ cart: updatedCart });

      // Save to AsyncStorage
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));

      // Sync with server if user is logged in
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        try {
          const response = await axios.delete('http://172.20.10.2:4000/api/user/remove_cart', {
            data: { productId, size },
            headers: {
              Authorization: `Bearer ${userToken}`
            }
          });

          if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to sync with server');
          }
        } catch (error) {
          console.error('Error syncing cart with server:', error.response?.data || error.message);
          // Revert local changes if server sync fails
          const storedCart = await AsyncStorage.getItem('cart');
          if (storedCart) {
            const parsedCart = JSON.parse(storedCart);
            set({ cart: parsedCart });
          }
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in removeFromCart:', error);
      throw error;
    }
  },

  updateCartItemQuantity: async (productId, quantity) => {
    try {
      const state = get();
      const updatedItems = state.cart.items.map(item => {
        if (item.productId._id === productId) {
          return { ...item, quantity };
        }
        return item;
      });

      const totalAmount = updatedItems.reduce(
        (total, item) => total + (item.price * item.quantity),
        0
      );

      const updatedCart = {
        items: updatedItems,
        totalAmount
      };

      // Update local state
      set({ cart: updatedCart });

      // Save to AsyncStorage
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));

      // Sync with server if user is logged in
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        try {
          const response = await axios.put('http://172.20.10.2:4000/api/user/edit_cart', {
            productId,
            quantity
          }, {
            headers: {
              Authorization: `Bearer ${userToken}`
            }
          });

          if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to sync with server');
          }
        } catch (error) {
          console.error('Error syncing cart with server:', error.response?.data || error.message);
          // Revert local changes if server sync fails
          const storedCart = await AsyncStorage.getItem('cart');
          if (storedCart) {
            const parsedCart = JSON.parse(storedCart);
            set({ cart: parsedCart });
          }
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in updateCartItemQuantity:', error);
      throw error;
    }
  },

  clearCart: async () => {
    try {
      const emptyCart = { items: [], totalAmount: 0 };
      set({ cart: emptyCart });
      await AsyncStorage.setItem('cart', JSON.stringify(emptyCart));

      // Sync with server if user is logged in
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        try {
          const response = await axios.delete('http://172.20.10.2:4000/api/user/clear_cart', {
            headers: {
              Authorization: `Bearer ${userToken}`
            }
          });

          if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to sync with server');
          }
        } catch (error) {
          console.error('Error syncing cart with server:', error.response?.data || error.message);
          // Revert local changes if server sync fails
          const storedCart = await AsyncStorage.getItem('cart');
          if (storedCart) {
            const parsedCart = JSON.parse(storedCart);
            set({ cart: parsedCart });
          }
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in clearCart:', error);
      throw error;
    }
  },

  syncCartWithServer: async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        console.log('No user token found, skipping server sync');
        return;
      }

      const response = await axios.get('http://172.20.10.2:4000/api/user/cart', {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });

      if (response.data.success) {
        const serverCart = response.data.cart;
        set({ cart: serverCart });
        await AsyncStorage.setItem('cart', JSON.stringify(serverCart));
        console.log('Successfully synced cart with server');
      } else {
        console.error('Server returned error:', response.data.message);
      }
    } catch (error) {
      console.error('Error syncing cart with server:', error.response?.data || error.message);
      // Try to load from AsyncStorage as fallback
      try {
        const storedCart = await AsyncStorage.getItem('cart');
        if (storedCart) {
          const parsedCart = JSON.parse(storedCart);
          set({ cart: parsedCart });
          console.log('Loaded cart from AsyncStorage as fallback');
        }
      } catch (storageError) {
        console.error('Error loading cart from AsyncStorage:', storageError);
      }
    }
  }
}));
