import { z } from "zod";

export const employeeSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  dni: z
    .string()
    .length(8, "El DNI debe tener 8 dígitos")
    .regex(/^\d+$/, "El DNI solo debe contener números"),
  firstName: z.string().min(2, "Nombres es requerido").transform((v) => v.toUpperCase()),
  lastName: z.string().min(2, "Apellidos es requerido").transform((v) => v.toUpperCase()),
  position: z.string().min(1, "Cargo es requerido"),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;
