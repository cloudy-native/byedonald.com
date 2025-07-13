import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Progress,
  SimpleGrid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import { graphql, HeadFC, Link, PageProps, useStaticQuery } from "gatsby";
import * as React from "react";

// Helper function to get the number of days in a month
const daysInMonth = (month: number, year: number) => {
  return new Date(year, month + 1, 0).getDate();
};

// Helper function to get the first day of the month (0=Sun, 1=Mon, ...)
const firstDayOfMonth = (month: number, year: number) => {
  return new Date(year, month, 1).getDay();
};

const monthNames = Array.from({ length: 12 }, (_, i) =>
  new Date(0, i).toLocaleString("en-US", { month: "long" })
);

const dayNames = Array.from({ length: 7 }, (_, i) =>
  // Use a known Sunday (day 0) to start from
  new Date(1970, 0, 4 + i).toLocaleString("en-US", { weekday: "short" })
);

interface MonthViewProps {
  month: number; // 0-11
  year: number;
  newsDates: Set<string>;
  backgroundImage: string;
}

const MonthView: React.FC<MonthViewProps> = ({
  month,
  year,
  newsDates,
  backgroundImage,
}) => {
  const totalDays = daysInMonth(month, year);
  const startDay = firstDayOfMonth(month, year);

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to the start of the day

  const days = [];
  // Add empty placeholders for days before the 1st of the month
  for (let i = 0; i < startDay; i++) {
    days.push(<Box key={`empty-${i}`} />);
  }
  // Add day buttons
  for (let day = 1; day <= totalDays; day++) {
    const currentDate = new Date(year, month, day);
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const hasNews = newsDates.has(dateString);

    let colorScheme = "gray";
    let variant: "ghost" | "solid" = "ghost";

    if (hasNews) {
      colorScheme = "blue";
      variant = "solid";
    }

    if (currentDate.getTime() === today.getTime()) {
      colorScheme = "blue";
      variant = "solid";
    }

    const dayButton = (
      <Button
        as={hasNews ? Link : "button"}
        // @ts-ignore - Gatsby's Link component props are not perfectly typed here
        to={hasNews ? `/news/${dateString}/` : undefined}
        key={day}
        borderRadius="full"
        size="sm"
        variant={variant}
        colorScheme={colorScheme}
        isDisabled={!hasNews}
      >
        {day}
      </Button>
    );

    days.push(dayButton);
  }

  const bgColor = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("blue.600", "blue.300");

  return (
    <VStack
      spacing={4}
      p={4}
      bg={bgColor}
      borderRadius="lg"
      border="1px"
      borderColor={borderColor}
      align="stretch"
      position="relative"
      overflow="hidden"
      sx={{
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.05,
          zIndex: 0,
        },
        ">*": {
          position: "relative",
          zIndex: 1,
        },
      }}
    >
      <Heading as="h3" size="md" textAlign="center" color={textColor}>
        {monthNames[month]}
      </Heading>
      <SimpleGrid columns={7} spacing={1}>
        {dayNames.map((day) => (
          <Text
            key={day}
            textAlign="center"
            fontWeight="bold"
            fontSize="sm"
            color={textColor}
          >
            {day}
          </Text>
        ))}
        {days}
      </SimpleGrid>
    </VStack>
  );
};

const TermProgressBar: React.FC = () => {
  const startDate = new Date("2025-01-20T12:00:00-05:00");
  const endDate = new Date("2029-01-20T12:00:00-05:00");
  const now = new Date();

  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsedDuration = now.getTime() - startDate.getTime();

  const progressPercentage = Math.max(
    0,
    Math.min(100, (elapsedDuration / totalDuration) * 100)
  );
  const textColor = useColorModeValue("blue.600", "blue.300");
 
  return (
    <Box w="full" maxW="lg">
      <Progress
        value={progressPercentage}
        size="sm"
        colorScheme="blue"
        hasStripe
        isAnimated
      />
      <Flex justify="space-between" mt={1}>
        <Text fontSize="xs" color={textColor}>
          Inauguration Day 2025
        </Text>
        <Text fontSize="xs" color={textColor}>
          End of Term
        </Text>
      </Flex>
    </Box>
  );
};

const Countdown: React.FC = () => {
  const calculateTimeLeft = () => {
    const difference = +new Date("2029-01-20T12:00:00-05:00") - +new Date();
    let timeLeft = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = React.useState(calculateTimeLeft());

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  });

  const textColor = useColorModeValue("blue.600", "blue.300");

  return (
    <HStack spacing={4}>
      {Object.entries(timeLeft).map(([unit, value]) => (
        <Box key={unit} textAlign="center">
          <Text fontSize="4xl" fontWeight="bold" color={textColor}>
            {value}
          </Text>
          <Text fontSize="sm" textTransform="uppercase" color={textColor}>
            {unit}
          </Text>
        </Box>
      ))}
    </HStack>
  );
};

const IndexPage: React.FC<PageProps> = () => {
  const startYear = 2024;
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - startYear + 1 },
    (_, i) => startYear + i
  );
  const months = Array.from({ length: 12 }, (_, i) => i); // 0-11

  const data = useStaticQuery(graphql`
    query {
      allFile(filter: { sourceInstanceName: { eq: "news" } }) {
        nodes {
          name
        }
      }
      backgroundImages: allFile(
        filter: { sourceInstanceName: { eq: "backgrounds" } }
      ) {
        nodes {
          publicURL
        }
      }
    }
  `);

  const newsDates = new Set(
    data.allFile.nodes.map((node: { name: string }) => node.name)
  );

  const backgroundImages = data.backgroundImages.nodes;
  const textColor = useColorModeValue("blue.600", "blue.300");
  const bgGradient = useColorModeValue(
    "linear(to-b, blue.50, white)",
    "linear(to-b, gray.900, gray.800)"
  );
  const bg = useColorModeValue("blue.50", "gray.900");

  return (
    <Box bg={bg} bgGradient={bgGradient} pt={16} pb={10}>
      <VStack spacing={8} p={{ base: 4, md: 8 }}>
        <Heading as="h1" size="2xl" color={textColor}>
          Four More Years. Deep Breaths.
        </Heading>
        <Text fontSize="lg" maxW="2xl" color={textColor}>
          It's our solemn, slightly-panicked duty to keep track of it all. For
          posterity. For our sanity. For the history books that will one day
          ask, "Wait, really?"
        </Text>
        <TermProgressBar />
        <Countdown />
        {/* <Search /> */}
      </VStack>

      <Box p={8}>
        <VStack spacing={8} align="stretch">
          <Heading as="h2" size="xl" textAlign="center" color={textColor}>
            News Calendar
          </Heading>
          <Tabs
            isFitted
            variant="enclosed"
            defaultIndex={years.indexOf(new Date().getFullYear())}
          >
            <TabList>
              {years.map((year) => (
                <Tab key={year} fontSize="2xl" fontWeight="bold">
                  {year}
                </Tab>
              ))}
            </TabList>
            <TabPanels>
              {years.map((year) => (
                <TabPanel key={year} p={0} pt={4}>
                  <SimpleGrid
                    columns={{ base: 1, md: 2, lg: 3 }}
                    spacing={8}
                    width="100%"
                  >
                    {months.map((month, monthIndex) => {
                      const imageIndex =
                        backgroundImages.length > 0
                          ? ((monthIndex + 1) * year) % backgroundImages.length
                          : 0;
                      const deterministicImage =
                        backgroundImages.length > 0
                          ? backgroundImages[imageIndex]
                          : { publicURL: "" };

                      return (
                        <MonthView
                          key={`${year}-${month}`}
                          month={month}
                          year={year}
                          newsDates={newsDates}
                          backgroundImage={deterministicImage.publicURL}
                        />
                      );
                    })}
                  </SimpleGrid>
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </VStack>
      </Box>
    </Box>
  );
};

export default IndexPage;

export const Head: HeadFC = () => <title>2025 Calendar</title>;
