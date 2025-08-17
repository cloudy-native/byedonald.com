import { Button, HStack, Select, Text } from "@chakra-ui/react";

export type PaginationControlsProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
  onPageSizeChange: (n: number) => void;
};

function PaginationControls({
  page,
  totalPages,
  pageSize,
  onPrev,
  onNext,
  onPageSizeChange,
}: PaginationControlsProps) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <HStack justify="center" align="center" spacing={4} wrap="wrap">
      <Button size="sm" onClick={onPrev} isDisabled={page <= 1}>
        Prev
      </Button>
      <Text fontSize="sm" color="gray.600">
        Page {page} of {totalPages}
      </Text>
      <Button size="sm" onClick={onNext} isDisabled={page >= totalPages}>
        Next
      </Button>
      <HStack spacing={2} pl={2}>
        <Select
          size="sm"
          value={pageSize}
          onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
          maxW="24"
        >
          <option value={12}>12</option>
          <option value={24}>24</option>
          <option value={48}>48</option>
        </Select>
        <Text fontSize="xs" color="gray.500">
          per page
        </Text>
      </HStack>
    </HStack>
  );
}

export default PaginationControls;
