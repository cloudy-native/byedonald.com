import {
  Box,
  chakra,
  Icon,
  Link,
  Text,
  useColorModeValue,
  VisuallyHidden,
} from "@chakra-ui/react";
import type React from "react";
import { FaLinkedin } from "react-icons/fa";

const _SocialButton = ({
  children,
  label,
  href,
}: {
  children: React.ReactNode;
  label: string;
  href: string;
}) => {
  return (
    <chakra.button
      bg={useColorModeValue("neutral.100", "neutral.800")}
      rounded={"full"}
      w={8}
      h={8}
      cursor={"pointer"}
      as={"a"}
      href={href}
      display={"inline-flex"}
      alignItems={"center"}
      justifyContent={"center"}
      transition={"background 0.3s ease"}
      _hover={{
        bg: useColorModeValue("primary.500", "primary.400"),
        color: "white",
      }}
    >
      <VisuallyHidden>{label}</VisuallyHidden>
      {children}
    </chakra.button>
  );
};

const _ListHeader = ({ children }: { children: React.ReactNode }) => {
  return (
    <Text fontWeight={"600"} fontSize={"lg"} mb={2}>
      {children}
    </Text>
  );
};

const Footer = () => {
  const bgColor = useColorModeValue("neutral.50", "neutral.900");
  const borderColor = useColorModeValue("neutral.200", "neutral.700");
  const textColor = useColorModeValue("neutral.700", "neutral.300");

  return (
    <Box
      as="footer"
      bg={bgColor}
      color={textColor}
      borderTop="1px"
      borderColor={borderColor}
    >
      <Box py={4}>
        <Text pt={2} fontSize={"sm"} textAlign={"center"}>
          © {new Date().getFullYear()} Bye Donald. All rights reserved. Made
          with ❤️ by{" "}
          <Link
            href="https://www.linkedin.com/in/stephenharrison/"
            target="_blank"
            isExternal
          >
            Stephen Harrison <Icon as={FaLinkedin} />
          </Link>
          .
        </Text>
      </Box>
    </Box>
  );
};

export default Footer;
