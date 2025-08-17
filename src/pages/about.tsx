import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Icon,
  Link,
  SimpleGrid,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import { graphql, type HeadFC, type PageProps, useStaticQuery } from "gatsby";
import { GatsbyImage, type IGatsbyImageData } from "gatsby-plugin-image";
import type * as React from "react";
import type { IconType } from "react-icons";
import { FaCode, FaGithub, FaSearch, FaTags } from "react-icons/fa";

const AboutHero = () => {
  const bgGradient = useColorModeValue(
    "linear(to-b, blue.50, white)",
    "linear(to-b, gray.900, gray.800)",
  );
  const bg = useColorModeValue("blue.50", "gray.900");
  const accentColor = useColorModeValue("blue.600", "blue.300");
  const textColor = useColorModeValue("gray.700", "gray.100");

  return (
    <Box bg={bg} bgGradient={bgGradient} pt={16} pb={10}>
      <Stack spacing={6} textAlign="center">
        <Heading
          as="h1"
          fontSize={{ base: "3xl", md: "4xl", lg: "5xl" }}
          fontWeight="bold"
          color={accentColor}
          lineHeight="1.2"
        >
          About ByeDonald.com
        </Heading>
        <Text
          fontSize={{ base: "md", md: "lg" }}
          color={textColor}
          maxW="3xl"
          mx="auto"
          lineHeight="1.8"
        >
          This project is an open-source effort to track and categorize news
          related to Donald Trump's second term as President. It aims to provide
          a factual, day-by-day overview of events as reported by various news
          outlets.
        </Text>
      </Stack>
    </Box>
  );
};

const Feature = ({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: IconType;
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  return (
    <Box
      p={5}
      shadow="md"
      borderRadius="lg"
      bg={bgColor}
      borderColor={borderColor}
    >
      <Flex align="center" mb={4}>
        <Flex
          w={12}
          h={12}
          align="center"
          justify="center"
          color="white"
          rounded="full"
          bg="blue.500"
          mr={4}
        >
          <Icon as={icon} w={6} h={6} />
        </Flex>
        <Heading fontSize="xl">{title}</Heading>
      </Flex>
      <Text color={useColorModeValue("gray.600", "gray.400")}>{text}</Text>
    </Box>
  );
};

const AboutPage: React.FC<PageProps> = () => {
  const data = useStaticQuery(graphql`
    query {
      backgroundImages: allFile(
        filter: { sourceInstanceName: { eq: "backgrounds" } }
      ) {
        nodes {
          name
          childImageSharp {
            gatsbyImageData(
              width: 100
              placeholder: BLURRED
              formats: [AUTO, WEBP, AVIF]
            )
          }
        }
      }
    }
  `);

  type BackgroundImageNode = {
    name: string;
    childImageSharp?: {
      gatsbyImageData: IGatsbyImageData;
    };
  };

  const backgroundImages: BackgroundImageNode[] = data.backgroundImages.nodes;

  type AttributionData = {
    creator: string;
    creatorLink: string;
    imageLink?: string;
    imageName?: string;
    license: string;
    licenseLink: string;
  };

  const attributionData: { [key: string]: AttributionData } = {
    "bald-eagle": {
      creator: "Pen Waggener",
      creatorLink: "https://www.flickr.com/photos/epw/",
      imageLink: "https://flic.kr/p/wMTDT",
      imageName: "Bald Eagle",
      license: "CC BY 2.0",
      licenseLink: "https://creativecommons.org/licenses/by/2.0/deed.en",
    },
    "old-glory": {
      creator: "D. Williams",
      creatorLink: "https://www.flickr.com/photos/133435858@N02/",
      license: "CC0 1.0",
      licenseLink: "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
    },
    "uncle-sam": {
      creator: "DonkeyHotey",
      creatorLink: "https://www.flickr.com/photos/donkeyhotey/",
      license: "CC BY 2.0",
      licenseLink: "https://creativecommons.org/licenses/by/2.0/deed.en",
    },
    "us-capitol": {
      creator: "ThatMakesThree",
      creatorLink: "https://www.flickr.com/photos/thatmakesthree/",
      license: "CC BY 2.0",
      licenseLink: "https://creativecommons.org/licenses/by/2.0/deed.en",
    },
    "white-house": {
      creator: "ThatMakesThree",
      creatorLink: "https://www.flickr.com/photos/thatmakesthree/",
      license: "CC BY 2.0",
      licenseLink: "https://creativecommons.org/licenses/by/2.0/deed.en",
    },
    "dollar-bill": {
      creator: "Alejandro Mallea",
      creatorLink: "https://www.flickr.com/photos/janoma/",
      license: "CC BY 2.0",
      licenseLink: "https://creativecommons.org/licenses/by/2.0/deed.en",
    },
    "lincoln-memorial": {
      creator: "Sergiy Galyonkin",
      creatorLink: "https://www.flickr.com/photos/sergesegal/",
      license: "CC BY-SA 2.0",
      licenseLink: "https://creativecommons.org/licenses/by-sa/2.0/deed.en",
    },
    "we-the-people": {
      creator: "Backbone Campaign",
      creatorLink: "https://www.flickr.com/photos/backbone_campaign/",
      license: "CC BY 2.0",
      licenseLink: "https://creativecommons.org/licenses/by/2.0/deed.en",
    },
  };
  const textColor = useColorModeValue("gray.700", "gray.300");
  const sectionBg = useColorModeValue("gray.50", "gray.800");

  return (
    <>
      <AboutHero />

      <Container maxW="6xl" py={12}>
        <VStack spacing={12}>
          {/* How It Works */}
          <Box w="full">
            <Heading
              as="h2"
              size="lg"
              mb={6}
              textAlign="center"
              color={useColorModeValue("blue.600", "blue.300")}
            >
              How It Works
            </Heading>
            <Text
              fontSize="lg"
              lineHeight="tall"
              textAlign="center"
              maxW="3xl"
              mx="auto"
              color={textColor}
              mb={10}
            >
              The content on this site is generated through a fully automated
              pipeline that ensures daily updates and consistent categorization.
            </Text>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10}>
              <Feature
                icon={FaCode}
                title="1. Fetch News"
                text="Every day, a script fetches the latest news articles related to Donald Trump from a variety of sources using the GNews.io API."
              />
              <Feature
                icon={FaTags}
                title="2. Tag Articles"
                text="Each article is then processed by Anthropic's Claude AI model, which reads the content and assigns relevant tags to categorize the news."
              />
              <Feature
                icon={FaSearch}
                title="3. Index for Search"
                text="All tagged articles are sent to Algolia, which powers the fast and accurate search functionality you can use across the site."
              />
            </SimpleGrid>
          </Box>

          {/* Acknowledgements */}
          <Box w="full" py={10} bg={sectionBg} borderRadius="lg">
            <Container maxW="5xl">
              <Heading
                as="h2"
                size="lg"
                mb={10}
                textAlign="center"
                color={useColorModeValue("blue.600", "blue.300")}
              >
                Acknowledgements & Technology
              </Heading>
              <Text
                fontSize="lg"
                textAlign="center"
                maxW="3xl"
                mx="auto"
                color={textColor}
                mb={10}
              >
                This project would not be possible without several key services
                and open-source technologies.
              </Text>
              <Stack
                direction={{ base: "column", md: "row" }}
                spacing={8}
                justify="center"
                align="center"
              >
                <Link href="https://gnews.io/" isExternal fontWeight="bold">
                  GNews.io
                </Link>
                <Link
                  href="https://www.anthropic.com/"
                  isExternal
                  fontWeight="bold"
                >
                  Anthropic Claude
                </Link>
                <Link
                  href="https://www.algolia.com/"
                  isExternal
                  fontWeight="bold"
                >
                  Algolia
                </Link>
                <Link
                  href="https://www.gatsbyjs.com/"
                  isExternal
                  fontWeight="bold"
                >
                  Gatsby
                </Link>
                <Link
                  href="https://www.typescriptlang.org/"
                  isExternal
                  fontWeight="bold"
                >
                  TypeScript
                </Link>
                <Link
                  href="https://chakra-ui.com/"
                  isExternal
                  fontWeight="bold"
                >
                  Chakra UI
                </Link>
              </Stack>
            </Container>
          </Box>

          {/* Image Attributions */}
          <Box w="full">
            <Heading
              as="h2"
              size="lg"
              mb={6}
              textAlign="center"
              color={useColorModeValue("blue.600", "blue.300")}
            >
              Image Attributions
            </Heading>
            <Text
              fontSize="lg"
              textAlign="center"
              maxW="3xl"
              mx="auto"
              color={textColor}
              mb={10}
            >
              The background images used on the calendar are sourced from
              talented photographers. We are grateful for their work.
            </Text>
            <TableContainer maxW="3xl" mx="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Thumbnail</Th>
                    <Th>Name</Th>
                    <Th>Creator</Th>
                    <Th>License</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {backgroundImages.map((image: BackgroundImageNode) => {
                    const gImg = image.childImageSharp?.gatsbyImageData;
                    if (!gImg) return null;

                    const attr = attributionData[image.name];
                    const imageLink = attr?.imageLink;
                    const imageName = attr?.imageName || image.name;

                    return (
                      <Tr key={image.name}>
                        <Td>
                          {imageLink ? (
                            <Link href={imageLink} isExternal>
                              <GatsbyImage
                                image={gImg}
                                alt={`Thumbnail for ${image.name}`}
                                style={{ borderRadius: "4px" }}
                              />
                            </Link>
                          ) : (
                            <GatsbyImage
                              image={gImg}
                              alt={`Thumbnail for ${image.name}`}
                              style={{ borderRadius: "4px" }}
                            />
                          )}
                        </Td>
                        <Td>
                          {imageLink ? (
                            <Link href={imageLink} isExternal>
                              {imageName}
                            </Link>
                          ) : (
                            imageName
                          )}
                        </Td>
                        <Td>
                          <Link href={attr?.creatorLink} isExternal>
                            {attr?.creator}
                          </Link>
                        </Td>
                        <Td>
                          <Link href={attr?.licenseLink} isExternal>
                            {attr?.license}
                          </Link>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>

          {/* Get Started */}
          <Box w="full" my={6} textAlign="center">
            <Heading
              as="h2"
              size="lg"
              mb={6}
              color={useColorModeValue("blue.600", "blue.300")}
            >
              Open Source
            </Heading>
            <Text fontSize="lg" maxW="2xl" mx="auto" mb={8} color={textColor}>
              This entire project is open source. You can view the code, report
              issues, or contribute on GitHub.
            </Text>
            <Button
              as={Link}
              href="https://github.com/cloudy-native/byedonald.com"
              isExternal
              leftIcon={<FaGithub />}
              colorScheme="blue"
              size="lg"
              rounded="full"
            >
              View on GitHub
            </Button>
          </Box>
        </VStack>
      </Container>
    </>
  );
};

export default AboutPage;

export const Head: HeadFC = () => <title>About | Bye Donald</title>;
