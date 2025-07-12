import {
  Box,
  Button,
  SimpleGrid,
  Heading,
  Text,
  VStack,
  useColorModeValue,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Progress,
  Flex,
} from "@chakra-ui/react";
import { HeadFC, PageProps, useStaticQuery, graphql, Link } from "gatsby";
import * as React from "react";
import { HStack } from "@chakra-ui/react";
import Search from "../components/Search";

// Helper function to get the number of days in a month
const daysInMonth = (month: number, year: number) => {
  return new Date(year, month + 1, 0).getDate();
};

// Helper function to get the first day of the month (0=Sun, 1=Mon, ...)
const firstDayOfMonth = (month: number, year: number) => {
  return new Date(year, month, 1).getDay();
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface MonthViewProps {
  month: number; // 0-11
  year: number;
  newsDates: Set<string>;
}

const MonthView: React.FC<MonthViewProps> = ({ month, year, newsDates }) => {
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

  return (
    <VStack
      spacing={4}
      p={4}
      bg={bgColor}
      borderRadius="lg"
      border="1px"
      borderColor={borderColor}
      align="stretch"
    >
      <Heading as="h3" size="md" textAlign="center">
        {monthNames[month]}
      </Heading>
      <SimpleGrid columns={7} spacing={1}>
        {dayNames.map((day) => (
          <Text key={day} textAlign="center" fontWeight="bold" fontSize="sm">
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
        <Text fontSize="xs">Inauguration Day 2025</Text>
        <Text fontSize="xs">End of Term</Text>
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

  return (
    <HStack spacing={4}>
      {Object.entries(timeLeft).map(([unit, value]) => (
        <Box key={unit} textAlign="center">
          <Text fontSize="4xl" fontWeight="bold">
            {value}
          </Text>
          <Text fontSize="sm" textTransform="uppercase">
            {unit}
          </Text>
        </Box>
      ))}
    </HStack>
  );
};

const IndexPage: React.FC<PageProps> = () => {
  const years = [2025, 2026, 2027, 2028, 2029];
  const months = Array.from({ length: 12 }, (_, i) => i); // 0-11

  const data = useStaticQuery(graphql`
    query {
      allFile(filter: { sourceInstanceName: { eq: "news" } }) {
        nodes {
          name
        }
      }
    }
  `);

  const newsDates = new Set(
    data.allFile.nodes.map((node: { name: string }) => node.name)
  );

  return (
    <Box>
      <VStack spacing={4} pt={20} px={8} textAlign="center">
        <Heading as="h1" size="2xl">
          Lest we forget...
        </Heading>
        <Text fontSize="lg">
          Counting down the days until we can say "Bye Donald". Until then, we
          preserve the trainwreck of his presidency.
        </Text>
        <Text fontSize="lg">
          We'll kid ourselves at some future date it couldn't possibly have been
          that bad. Is was. It is. Lest we forget...
        </Text>
        <TermProgressBar />
        <Countdown />
        <Search />
      </VStack>

      <Box p={8}>
        <VStack spacing={8} align="stretch">
          <Heading as="h2" size="xl" textAlign="center">
            News Calendar
          </Heading>
          <Tabs isFitted variant="enclosed" defaultIndex={0}>
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
                    {months.map((month) => (
                      <MonthView
                        key={`${year}-${month}`}
                        month={month}
                        year={year}
                        newsDates={newsDates}
                      />
                    ))}
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
