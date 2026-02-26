'use client';

import { ApolloClient, InMemoryCache, createHttpLink, ApolloProvider } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { loadErrorMessages, loadDevMessages } from '@apollo/client/dev';
import Cookies from 'js-cookie';
import { useMemo } from 'react';

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  loadDevMessages();
  loadErrorMessages();
}

export default function ApolloProviderWrapper({ children }: { children: React.ReactNode }) {
  
  const client = useMemo(() => {
    const httpLink = createHttpLink({
      uri: 'http://127.0.0.1:3400/graphql',
    });

    const authLink = setContext((_, { headers }) => {
      const token = Cookies.get('token');
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : "",
        }
      };
    });

    // --- Перехватчик ошибок ---
    const errorLink = onError(({ graphQLErrors, networkError, response }) => {
      if (graphQLErrors) {
        for (let err of graphQLErrors) {
          // 👇 ИЗМЕНЕНИЕ ЗДЕСЬ: Добавлена проверка на второе сообщение об ошибке
          if (
            err.message === 'Сессия была завершена' || 
            err.message === 'Сессия недействительна или была завершена.'
          ) {
            Cookies.remove('token');
            Cookies.remove('user');
            window.location.href = '/'; // Редирект на главную (авторизацию)
            break;
          }
          
          // Не показывать ошибку «Вы вышли из этой беседы»
          if (response && graphQLErrors.every((e) => e.message === 'Вы вышли из этой беседы')) {
            response.errors = undefined;
          }
        }
      }
      if (networkError) {
        console.error(`[Network error]: ${networkError}`);
      }
    });

    const link = errorLink.concat(authLink).concat(httpLink);

    return new ApolloClient({
      link: link,
      cache: new InMemoryCache(),
    });
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}