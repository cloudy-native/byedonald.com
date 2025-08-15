import { CloseIcon, HamburgerIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Collapse,
  Container,
  Flex,
  IconButton,
  Link,
  Stack,
  Text,
  useColorMode,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { Link as GatsbyLink } from "gatsby";
import React from "react";
import BuyMeCoffeeButton from "./BuyMeCoffeeButton";

interface NavItem {
  label: string;
  href: string;
  isExternal?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Calendar",
    href: "/",
  },
  {
    label: "Tags",
    href: "/tags/",
  },
  {
    label: "Sources",
    href: "/sources/",
  },
  {
    label: "About",
    href: "/about",
  },
];

const Header = () => {
  const { isOpen, onToggle } = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();

  // Use specific colors to ensure opacity in both modes
  const bgColor = useColorModeValue("white", "#1A202C"); // Using specific hex for dark mode
  const textColor = useColorModeValue("neutral.800", "neutral.100");
  const borderColor = useColorModeValue("neutral.200", "neutral.700");

  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={10}
      bg={bgColor}
      color={textColor}
      borderBottom="1px"
      borderColor={borderColor}
      boxShadow="sm"
      backdropFilter="none"
    >
      <Container maxW="container.xl" px={4}>
        <Flex
          minH={"60px"}
          py={{ base: 2 }}
          align={"center"}
          justify="space-between"
        >
          <Flex
            flex={{ base: 1, md: "auto" }}
            ml={{ base: -2 }}
            display={{ base: "flex", md: "none" }}
          >
            <IconButton
              onClick={onToggle}
              icon={
                isOpen ? (
                  <CloseIcon w={3} h={3} />
                ) : (
                  <HamburgerIcon w={5} h={5} />
                )
              }
              variant={"ghost"}
              aria-label={"Toggle Navigation"}
            />
          </Flex>

          <Flex flex={{ base: 1 }} justify={{ base: "center", md: "start" }}>
            <Text
              as={GatsbyLink}
              to="/"
              textAlign={{ base: "center", md: "left" }}
              fontFamily={"heading"}
              fontWeight="bold"
              fontSize="xl"
              color="primary.500"
              _hover={{
                textDecoration: "none",
                color: "primary.600",
              }}
            >
              Bye Donald
            </Text>

            <Flex display={{ base: "none", md: "flex" }} ml={10}>
              <Stack direction={"row"} spacing={6} align="center">
                {NAV_ITEMS.map((navItem) => (
                  <Link
                    key={navItem.label}
                    as={!navItem.isExternal ? GatsbyLink : undefined}
                    to={!navItem.isExternal ? navItem.href : undefined}
                    href={navItem.isExternal ? navItem.href : undefined}
                    fontSize={"md"}
                    fontWeight={500}
                    color={textColor}
                    _hover={{
                      textDecoration: "none",
                      color: "primary.500",
                    }}
                  >
                    {navItem.label}
                  </Link>
                ))}
              </Stack>
            </Flex>
          </Flex>

          <Stack
            flex={{ base: 1, md: 0 }}
            justify={"flex-end"}
            direction={"row"}
            spacing={6}
          >
            <IconButton
              aria-label={`Switch to ${colorMode === "light" ? "dark" : "light"} mode`}
              variant="ghost"
              icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
              onClick={toggleColorMode}
            />
          </Stack>
        </Flex>

        <Collapse in={isOpen} animateOpacity>
          <Box pb={4} display={{ md: "none" }}>
            <Stack as={"nav"} spacing={4}>
              {NAV_ITEMS.map((navItem) => (
                <Link
                  key={navItem.label}
                  as={!navItem.isExternal ? GatsbyLink : undefined}
                  to={!navItem.isExternal ? navItem.href : undefined}
                  href={navItem.isExternal ? navItem.href : undefined}
                  py={2}
                  fontWeight={500}
                  color={textColor}
                  _hover={{
                    textDecoration: "none",
                    color: "primary.500",
                  }}
                >
                  {navItem.label}
                </Link>
              ))}
              <Button
                as={GatsbyLink}
                to="/contact"
                w="full"
                fontSize={"sm"}
                fontWeight={600}
                colorScheme="primary"
                variant="solid"
              >
                Get Started
              </Button>
            </Stack>
          </Box>
        </Collapse>
      </Container>
    </Box>
  );
};

export default Header;
