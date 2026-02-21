import {
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Tag,
  TagLabel,
  Text,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import type { HeadFC, PageProps } from "gatsby";
import * as React from "react";
import tagDefinitions from "../../data/tags/tags.json";
import worstThingsData from "../../data/worst-things/worst-things.json";
import { TagLegend } from "../components/TagLegend";

type WorstThingItem = {
  id: number;
  text: string;
  tags: string[];
};

type WorstThingsMonth = {
  year: number;
  month: number;
  items: WorstThingItem[];
};

type WorstThingsData = {
  months: WorstThingsMonth[];
};

type TagDefinitionTag = {
  id: string;
  name: string;
  description: string;
};

type TagDefinitionCategory = {
  title: string;
  description: string;
  color: string;
  tags: TagDefinitionTag[];
};

type TagMeta = {
  name: string;
  color: string;
};

const monthLabel = (year: number, month: number) =>
  new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

const WorstThingEntry: React.FC<{
  item: WorstThingItem;
  tagMetaById: ReadonlyMap<string, TagMeta>;
  scrollMarginTop?: string;
}> = ({ item, tagMetaById, scrollMarginTop }) => {
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const muted = useColorModeValue("gray.600", "gray.300");
  const numberColor = useColorModeValue("blue.700", "blue.300");
  const fallbackTagBg = useColorModeValue("blue.50", "whiteAlpha.200");
  const fallbackTagText = useColorModeValue("blue.700", "blue.200");

  return (
    <Card
      id={`wt-${item.id}`}
      bg={cardBg}
      borderWidth={1}
      borderColor={borderColor}
      variant="outline"
      scrollMarginTop={scrollMarginTop ?? "96px"}
      h="100%"
    >
      <CardBody display="flex" flexDirection="column" h="100%">
        <HStack spacing={3} align="flex-start">
          <Text
            fontSize="lg"
            fontWeight="bold"
            color={numberColor}
            flexShrink={0}
            minW="56px"
          >
            {item.id}.
          </Text>
          <VStack align="stretch" spacing={3} flex={1} minW={0} h="100%">
            <Text
              color={muted}
              fontSize="sm"
              lineHeight="tall"
              whiteSpace="pre-wrap"
            >
              {item.text}
            </Text>
            {Array.isArray(item.tags) && item.tags.length > 0 ? (
              <HStack spacing={2} flexWrap="wrap" mt="auto" pt={2}>
                {item.tags
                  .slice()
                  .sort()
                  .map((id) => {
                    const meta = tagMetaById.get(id);
                    if (!meta) {
                      return (
                        <Tag
                          key={id}
                          size="sm"
                          bg={fallbackTagBg}
                          color={fallbackTagText}
                        >
                          <TagLabel>{id}</TagLabel>
                        </Tag>
                      );
                    }
                    return (
                      <Tag key={id} size="sm" bg={meta.color} color="white">
                        <TagLabel>{meta.name}</TagLabel>
                      </Tag>
                    );
                  })}
              </HStack>
            ) : null}
          </VStack>
        </HStack>
      </CardBody>
    </Card>
  );
};

const WorstThingsPage: React.FC<PageProps> = () => {
  const data = worstThingsData as unknown as WorstThingsData;

  const tagMetaById = React.useMemo(() => {
    const defs = tagDefinitions as unknown as TagDefinitionCategory[];
    const out = new Map<string, TagMeta>();
    for (const category of defs) {
      for (const t of category.tags) {
        out.set(t.id, { name: t.name, color: category.color });
      }
    }
    return out;
  }, []);

  const monthsChronological = React.useMemo(() => {
    const copy = [...(data.months ?? [])];
    copy.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
    return copy;
  }, [data.months]);

  const relevantTagIds = React.useMemo(() => {
    const out = new Set<string>();
    for (const month of monthsChronological) {
      for (const item of month.items) {
        for (const t of item.tags ?? []) out.add(t);
      }
    }
    return out;
  }, [monthsChronological]);

  const [activeTags, setActiveTags] = React.useState<Set<string>>(new Set());

  const totalItems = React.useMemo(() => {
    let count = 0;
    for (const m of monthsChronological) count += m.items.length;
    return count;
  }, [monthsChronological]);

  const [query, setQuery] = React.useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = React.useState<string>("");

  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(id);
  }, [query]);

  const searchableTextById = React.useMemo(() => {
    const out = new Map<number, string>();
    for (const month of monthsChronological) {
      for (const item of month.items) {
        const tagIds = Array.isArray(item.tags) ? item.tags : [];
        const tagNames = tagIds
          .map((t) => tagMetaById.get(t)?.name)
          .filter((n): n is string => typeof n === "string");
        const combined = [item.text, ...tagIds, ...tagNames]
          .join("\n")
          .toLowerCase();
        out.set(item.id, combined);
      }
    }
    return out;
  }, [monthsChronological, tagMetaById]);

  const filteredMonths = React.useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const hasQuery = q.length > 0;
    const hasTags = activeTags.size > 0;
    if (!hasQuery && !hasTags) return monthsChronological;

    return monthsChronological
      .map((m) => {
        const filteredItems = m.items.filter((item) => {
          const matchesTags =
            !hasTags || (item.tags ?? []).some((t) => activeTags.has(t));
          if (!matchesTags) return false;
          if (!hasQuery) return true;
          const haystack = searchableTextById.get(item.id) ?? "";
          return haystack.includes(q);
        });
        return { ...m, items: filteredItems };
      })
      .filter((m) => m.items.length > 0);
  }, [monthsChronological, activeTags, debouncedQuery, searchableTextById]);

  const filteredItemCount = React.useMemo(() => {
    let count = 0;
    for (const m of filteredMonths) count += m.items.length;
    return count;
  }, [filteredMonths]);

  const [selectedMonth, setSelectedMonth] = React.useState<string>(
    filteredMonths.length > 0
      ? `${filteredMonths[0].year}-${String(filteredMonths[0].month).padStart(2, "0")}`
      : "",
  );

  const [activeMonth, setActiveMonth] = React.useState<string>(selectedMonth);

  const stickyOffsetPx = 76;
  const stickyOffset = `${stickyOffsetPx}px`;

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (filteredMonths.length === 0) return;

    const ids = filteredMonths.map(
      (m) => `month-${m.year}-${String(m.month).padStart(2, "0")}`,
    );
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0),
          );
        if (visible.length === 0) return;
        const id = visible[0].target.id;
        const key = id.replace(/^month-/, "");
        setActiveMonth(key);
      },
      {
        root: null,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
        rootMargin: `-${stickyOffsetPx}px 0px -70% 0px`,
      },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [filteredMonths]);

  React.useEffect(() => {
    if (filteredMonths.length === 0) return;
    const firstKey = `${filteredMonths[0].year}-${String(filteredMonths[0].month).padStart(2, "0")}`;
    const stillExists = filteredMonths.some(
      (m) => `${m.year}-${String(m.month).padStart(2, "0")}` === selectedMonth,
    );
    if (!stillExists) {
      setSelectedMonth(firstKey);
      setActiveMonth(firstKey);
    }
  }, [filteredMonths, selectedMonth]);

  const bgGradient = useColorModeValue(
    "linear(to-b, blue.50, white)",
    "linear(to-b, gray.900, gray.800)",
  );
  const bg = useColorModeValue("blue.50", "gray.900");
  const titleColor = useColorModeValue("blue.700", "blue.300");
  const textColor = useColorModeValue("gray.700", "gray.200");
  const mutedLabelColor = useColorModeValue("gray.600", "gray.300");
  const stickyNavBg = useColorModeValue(
    "rgba(239, 246, 255, 0.92)",
    "rgba(17, 24, 39, 0.92)",
  );
  const stickyNavBorder = useColorModeValue(
    "rgba(59, 130, 246, 0.18)",
    "rgba(148, 163, 184, 0.18)",
  );

  return (
    <Box bg={bg} bgGradient={bgGradient} pt={16} pb={10}>
      <Container maxW="6xl">
        <HStack align="flex-start" spacing={8}>
          <Box
            display={{ base: "none", md: "block" }}
            position="sticky"
            top={stickyOffset}
            zIndex="sticky"
            w="260px"
            flexShrink={0}
            maxH="calc(100vh - 48px)"
            overflowY="auto"
            bg={stickyNavBg}
            borderWidth={1}
            borderColor={stickyNavBorder}
            borderRadius="lg"
            px={4}
            py={4}
            backdropFilter="blur(10px)"
          >
            <VStack align="stretch" spacing={3}>
              <VStack align="stretch" spacing={2}>
                {filteredMonths.map((m) => {
                  const key = `${m.year}-${String(m.month).padStart(2, "0")}`;
                  const isActive = key === activeMonth;
                  return (
                    <Button
                      key={key}
                      size="sm"
                      justifyContent="flex-start"
                      variant={isActive ? "solid" : "ghost"}
                      colorScheme="blue"
                      onClick={() => {
                        setSelectedMonth(key);
                        const el = document.getElementById(`month-${key}`);
                        if (el)
                          el.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }}
                    >
                      {monthLabel(m.year, m.month)}
                    </Button>
                  );
                })}
              </VStack>

              <TagLegend
                activeTags={activeTags}
                onTagClick={(tagId) => {
                  setActiveTags((prev) => {
                    const next = new Set(prev);
                    if (next.has(tagId)) next.delete(tagId);
                    else next.add(tagId);
                    return next;
                  });
                }}
                onClear={() => setActiveTags(new Set())}
                relevantTagIds={relevantTagIds}
              />
            </VStack>
          </Box>

          <Box flex={1} minW={0}>
            <Heading as="h1" size="2xl" color={titleColor}>
              500 Worst Things
            </Heading>
            <Text color={textColor} fontSize="sm">
              A comprehensive list documenting 500 of the worst things Trump and
              his admin did just in 2025.
            </Text>

            <VStack align="stretch" spacing={2} mt={4} mb={4}>
              <HStack align="center" spacing={3}>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search within 500 Worst Things…"
                  bg={useColorModeValue("white", "gray.800")}
                  borderColor={useColorModeValue("gray.200", "gray.700")}
                />
                {query.trim().length > 0 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setQuery("")}
                  >
                    Clear
                  </Button>
                ) : null}
              </HStack>
              <Text fontSize="sm" color={mutedLabelColor}>
                {`Showing ${filteredItemCount} of ${totalItems}`}
              </Text>
            </VStack>

            <VStack align="stretch" spacing={1} mt={2} mb={6}>
              <Text color={textColor} fontSize="sm">
                Thank you as always to Ron Filipkowski and Meidas Plus for
                amazing work putting this together:{" "}
                <a
                  href="https://www.meidasplus.com/p/500-worst-things-trump-did-in-2025"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://www.meidasplus.com/p/500-worst-things-trump-did-in-2025
                </a>
                .
              </Text>
              <Text color={textColor} fontSize="sm">
                Any errors in converting their original material are mine, and
                mine alone.
              </Text>
            </VStack>

            <VStack align="stretch" spacing={10}>
              {filteredMonths.map((m) => {
                const monthKey = `${m.year}-${String(m.month).padStart(2, "0")}`;
                return (
                  <Box
                    key={monthKey}
                    id={`month-${monthKey}`}
                    scrollMarginTop={stickyOffset}
                  >
                    <HStack justify="space-between" mb={4} align="baseline">
                      <Heading as="h2" size="lg" color={titleColor}>
                        {monthLabel(m.year, m.month)}
                      </Heading>
                    </HStack>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {m.items
                        .slice()
                        .sort((a, b) => a.id - b.id)
                        .map((item) => (
                          <WorstThingEntry
                            key={item.id}
                            item={item}
                            tagMetaById={tagMetaById}
                            scrollMarginTop={stickyOffset}
                          />
                        ))}
                    </SimpleGrid>
                  </Box>
                );
              })}
            </VStack>
          </Box>
        </HStack>
      </Container>
    </Box>
  );
};

export default WorstThingsPage;

export const Head: HeadFC = () => <title>Worst Things</title>;
