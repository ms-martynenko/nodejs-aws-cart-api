import {
  aws_apigateway,
  aws_ec2,
  aws_lambda_nodejs,
  aws_rds,
  aws_secretsmanager,
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { join } from 'path';

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = aws_ec2.Vpc.fromLookup(this, 'DefaultVPC', {
      isDefault: true,
    });

    const dbCredentialsSecret = new aws_secretsmanager.Secret(
      this,
      'MyDBCreds',
      {
        secretName: 'MyDBCredsName',
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            username: 'myadminuser',
          }),
          excludePunctuation: true,
          includeSpace: false,
          generateStringKey: 'password',
        },
      },
    );

    const dbInstance = new aws_rds.DatabaseInstance(this, 'RDSInstance', {
      engine: aws_rds.DatabaseInstanceEngine.postgres({
        version: aws_rds.PostgresEngineVersion.VER_17,
      }),

      instanceType: aws_ec2.InstanceType.of(
        aws_ec2.InstanceClass.BURSTABLE3,
        aws_ec2.InstanceSize.MICRO,
      ),
      vpc: vpc,
      credentials: aws_rds.Credentials.fromSecret(dbCredentialsSecret),
      vpcSubnets: {
        subnetType: aws_ec2.SubnetType.PUBLIC,
      },
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    const lambdaFunction = new aws_lambda_nodejs.NodejsFunction(
      this,
      'LambdaFunction',
      {
        handler: 'handler',
        memorySize: 1024,
        runtime: Runtime.NODEJS_20_X,
        timeout: Duration.seconds(30),
        entry: join(__dirname, '../../src/main.ts'),
        bundling: {
          externalModules: [
            'aws-sdk',
            '@nestjs/microservices',
            '@nestjs/websockets',
            'class-transformer',
            'class-validator',
            'cache-manager',
          ],
        },
        vpc: vpc,
        vpcSubnets: {
          subnetType: aws_ec2.SubnetType.PUBLIC,
        },
        allowPublicSubnet: true,
        environment: {
          DB_HOST: dbInstance.instanceEndpoint.hostname,
          DB_PORT: dbInstance.instanceEndpoint.port.toString(),
          DB_NAME: 'postgres',
          DB_USERNAME: dbCredentialsSecret
            .secretValueFromJson('username')
            .unsafeUnwrap(),
          DB_PASSWORD: dbCredentialsSecret
            .secretValueFromJson('password')
            .unsafeUnwrap(),
          DB_SYNCHRONIZE: 'true',
          DB_LOGGING: 'false',
        },
      },
    );

    dbInstance.connections.allowDefaultPortFrom(lambdaFunction);
    dbCredentialsSecret.grantRead(lambdaFunction);

    const api = new aws_apigateway.RestApi(this, 'NestApi', {
      restApiName: 'Nest Service',
      description: 'This service serves a Nest.js application.',
    });

    const getLambdaIntegration = new aws_apigateway.LambdaIntegration(
      lambdaFunction,
    );

    api.root.addMethod('GET', getLambdaIntegration);

    api.root.addProxy({
      defaultIntegration: getLambdaIntegration,
    });

    new CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'URL of the API Gateway',
      exportName: 'NestApiUrl',
    });

    new CfnOutput(this, 'RdsEndpoint', {
      value: dbInstance.instanceEndpoint.hostname,
      description: 'RDS PostgreSQL endpoint',
      exportName: 'RdsEndpoint',
    });
  }
}
