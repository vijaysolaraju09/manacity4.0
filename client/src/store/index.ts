import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import productReducer from './slices/productSlice';
import settingsReducer from './slices/settingsSlice';
import adminReducer from './slices/adminSlice';
import shopsReducer from './shops';
import eventsReducer from './events';
import eventRegistrationsReducer from './eventRegistrations';
import eventUpdatesReducer from './eventUpdates';
import eventLeaderboardReducer from './eventLeaderboard';
import eventBracketReducer from './eventBracket';
import catalogReducer from './products';
import verifiedReducer from './verified';
import servicesReducer from './services';
import serviceRequestsReducer from './serviceRequests';
import notifsReducer from './notifs';
import ordersReducer from './orders';
import userProfileReducer from './user';
import { injectStore } from '@/lib/http';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    products: productReducer,
    settings: settingsReducer,
    admin: adminReducer,
    shops: shopsReducer,
    events: eventsReducer,
    eventRegistrations: eventRegistrationsReducer,
    eventUpdates: eventUpdatesReducer,
    eventLeaderboard: eventLeaderboardReducer,
    eventBracket: eventBracketReducer,
    catalog: catalogReducer,
    verified: verifiedReducer,
    services: servicesReducer,
    serviceRequests: serviceRequestsReducer,
    notifs: notifsReducer,
    orders: ordersReducer,
    userProfile: userProfileReducer,
  },
});

injectStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
