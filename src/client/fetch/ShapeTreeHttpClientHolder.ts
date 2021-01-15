import { ShapeTreeException } from '@core/exceptions';
import { FetchHttpClient } from '@todo/FetchHttpClient';
import { ShapeTreeClientConfiguration } from './ShapeTreeClientConfiguration';
import { ValidatingShapeTreeInterceptor } from './ValidatingShapeTreeInterceptor';

/**
 * OkHttp documentation (https://square.github.io/okhttp/4.x/okhttp/okhttp3/-ok-http-client/#okhttpclients-should-be-shared)
 * recommends that instance of the client be shared/reused.  This class acts as a point of abstraction where a single
 * instance of the FetchHttpClient can be re-used for multiple configurations (validation on/off, https verification on/off).
 *
 * A static map of client references are managed per configuration which can be easily retrieved
 */
export class ShapeTreeHttpClientHolder {
    private static baseClient: FetchHttpClient = new FetchHttpClient();

    private static clientMap: Map<ShapeTreeClientConfiguration, FetchHttpClient> = new Map();

    /**
     * Gets an FetchHttpClient for a given configuration.  Looks up an instance from the private static clientMap.
     * If a client hasn't yet been initialized for a given configuration it is built and added to the cache.
     * @param configuration ShapeTreeClientConfiguration to retrieve a client for
     * @return FetchHttpClient instance for use
     * @throws ShapeTreeException ShapeTreeException
     */
    public static /* @@ synchronized */ getForConfig(configuration: ShapeTreeClientConfiguration): FetchHttpClient /* throws ShapeTreeException */ {
      if (ShapeTreeHttpClientHolder.clientMap.has(configuration)) {
        return ShapeTreeHttpClientHolder.clientMap.get(configuration)!!;
      }
      try {
        const client: FetchHttpClient = this.buildClientFromConfiguration(configuration);
        ShapeTreeHttpClientHolder.clientMap.set(configuration, client);
        return client;
      } catch (ex /* Exception */) {
        throw new ShapeTreeException(500, ex.getMessage());
      }
    }

    /* throws NoSuchAlgorithmException, KeyManagementException */
    private static buildClientFromConfiguration(configuration: ShapeTreeClientConfiguration): FetchHttpClient {
      const clientBuilder /*: FetchHttpClient.Builder */ = ShapeTreeHttpClientHolder.baseClient.newBuilder();
      if (configuration.getUseValidation()) {
        clientBuilder.interceptors().push(new ValidatingShapeTreeInterceptor());
      }
      if (configuration.getSkipSslValidation()) { /*
            // Install the all-trusting trust manager
            final SSLContext sslContext = SSLContext.getInstance("SSL");
            TrustManager[] trustAllCerts = getTrustAllCertsManager();
            sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
            // Create an ssl socket factory with our all-trusting manager
            final SSLSocketFactory sslSocketFactory = sslContext.getSocketFactory();

            clientBuilder.sslSocketFactory(sslSocketFactory, (X509TrustManager)trustAllCerts[0])
                .hostnameVerifier(getTrustAllHostnameVerifier());
        */ }
      return clientBuilder.build();
    }

  /*
    private static TrustManager[] getTrustAllCertsManager() {
        // Create a trust manager that does not validate certificate chains
        return new TrustManager[] {
            new X509TrustManager() {
                @Override
                public void checkClientTrusted(java.security.cert.X509Certificate[] chain, String authType) {
                }

                @Override
                public void checkServerTrusted(java.security.cert.X509Certificate[] chain, String authType) {
                }

                @Override
                public java.security.cert.X509Certificate[] getAcceptedIssuers() {
                    return new java.security.cert.X509Certificate[]{ };
                }
            }
        };
    }

    private static HostnameVerifier getTrustAllHostnameVerifier() {
        return (hostname, session) -> true;
    }
    */
}
