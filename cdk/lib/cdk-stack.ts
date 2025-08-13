import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3StaticWebsiteOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { FederatedPrincipal, OpenIdConnectProvider, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export interface WebsiteStackProps extends StackProps {
  domainName: string;
}

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props: WebsiteStackProps) {
    super(scope, id, props);

    const { domainName } = props;

    const githubOidcProvider =
      OpenIdConnectProvider.fromOpenIdConnectProviderArn(
        this,
        "GitHubOidcProvider",
        `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`
      );

    const githubActionsRole = new Role(this, "GitHubActionsRole", {
      description: "Role for GitHub Actions to deploy the site and use Bedrock",
      assumedBy: new FederatedPrincipal(
        githubOidcProvider.openIdConnectProviderArn,
        {
          // This condition scopes the role assumption to your specific repository
          StringLike: {
            "token.actions.githubusercontent.com:sub":
              "repo:cloudy-native/byedonald.com:*",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    githubActionsRole.addToPolicy(
      new PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: ["*"],
      })
    );

    // Create S3 bucket for website hosting
    const bucket = new Bucket(this, "WebsiteBucket", {
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "error.html",
      publicReadAccess: true,
      blockPublicAccess: new BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    bucket.grantReadWrite(githubActionsRole);

    const zone = HostedZone.fromLookup(this, "HostedZone", {
      domainName,
    });

    // Create ACM certificate
    const certificate = new Certificate(this, "SiteCertificate", {
      domainName,
      validation: CertificateValidation.fromDns(zone),
    });

    // CloudFront distribution
    const distribution = new Distribution(this, "SiteDistribution", {
      defaultBehavior: {
        origin: new S3StaticWebsiteOrigin(bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
      domainNames: [domainName],
      certificate: certificate,
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 403,
          responsePagePath: "/error.html",
        },
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: "/error.html",
        },
      ],
    });

    // Route53 alias record for the CloudFront distribution
    new ARecord(this, "SiteAliasRecord", {
      recordName: domainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      zone: zone,
    });

    new ARecord(this, "WWWAliasRecord", {
      recordName: `www.${domainName}`,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      zone: zone,
    });

    // Deploy site contents to S3 bucket
    new BucketDeployment(this, "DeployWebsite", {
      sources: [Source.asset("../public")],
      destinationBucket: bucket,
      distribution,
    });

    // Outputs
    new CfnOutput(this, "BucketName", {
      value: bucket.bucketName,
    });
  }
}
