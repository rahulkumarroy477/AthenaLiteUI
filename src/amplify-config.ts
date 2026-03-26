import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'ap-south-1_nrTKj4NxJ',
      userPoolClientId: '1118lpe6tgtj7he23p8kk7duse',
    }
  }
});
