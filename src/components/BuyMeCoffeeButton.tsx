import React from 'react';
import { Button, Link, Box, Text, Icon, useColorModeValue } from '@chakra-ui/react';

// Coffee cup icon component
const CoffeeIcon = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M2,21V19H20V21H2M20,8V5H18V8H20M20,3A2,2 0 0,1 22,5V8A2,2 0 0,1 20,10H18V13A4,4 0 0,1 14,17H8A4,4 0 0,1 4,13V3H20M16,5H6V13A2,2 0 0,0 8,15H14A2,2 0 0,0 16,13V5Z"
    />
  </Icon>
);

const BuyMeCoffeeButton = ({ username = "stephen.harrison", color = "yellow", size = "md" }) => {
  const bgColor = useColorModeValue('yellow.400', 'yellow.500');
  const hoverBgColor = useColorModeValue('yellow.500', 'yellow.600');
  const textColor = useColorModeValue('gray.800', 'gray.900');
  
  // Default link if no username is provided
  const buyMeACoffeeUrl = `https://www.buymeacoffee.com/${username}`;

  return (
    <Link href={buyMeACoffeeUrl} isExternal style={{ textDecoration: 'none' }}>
      <Button
        leftIcon={<CoffeeIcon />}
        bg={bgColor}
        color={textColor}
        size={size}
        fontWeight="bold"
        px={6}
        _hover={{
          bg: hoverBgColor,
          transform: 'translateY(-2px)',
          boxShadow: 'md',
        }}
        _active={{
          transform: 'translateY(0)',
          boxShadow: 'sm',
        }}
        transition="all 0.2s"
        borderRadius="full"
      >
        <Box as="span" display="flex" alignItems="center">
          <Text>Buy me a coffee</Text>
        </Box>
      </Button>
    </Link>
  );
};

export default BuyMeCoffeeButton;