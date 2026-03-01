import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import Cookies from 'js-cookie';

// 1. Указываем адрес бэкенда
const httpLink = createHttpLink({
  uri: 'http://127.0.0.1:3400/graphql',
});

// 2. Middleware для добавления заголовка Authorization
const authLink = setContext((_, { headers }) => {
  // Получаем токен из куки
  const token = Cookies.get('token');
  
  // Возвращаем заголовки с добавленным токеном
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

// 3. Создаем клиент
export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});