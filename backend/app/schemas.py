"""Modelos de entrada (validacion con Pydantic v2).

Todo lo que el front envia pasa por aqui antes de tocar la base de datos.
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

METODOS_PAGO = Literal["Efectivo", "Tarjeta", "Transferencia"]


class _Base(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, from_attributes=True)


# ---------------------------------------------------------------- Cliente
class ClienteCreate(_Base):
    nombre_completo: str = Field(min_length=3, max_length=100)
    telefono: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None
    estatus_activo: bool = True


class ClienteUpdate(ClienteCreate):
    pass


# ------------------------------------------------------------- Categoria
class CategoriaCreate(_Base):
    nombre_categoria: str = Field(min_length=3, max_length=50)
    descripcion: str | None = None


# ----------------------------------------------------------------- Equipo
class EquipoCreate(_Base):
    id_categoria: int
    nombre: str = Field(min_length=2, max_length=100)
    marca: str | None = Field(default=None, max_length=50)
    precio_renta_diario: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    stock: int = Field(ge=0)


class EquipoUpdate(EquipoCreate):
    pass


# ------------------------------------------------------------------ Renta
class DetalleCreate(_Base):
    id_equipo: int
    cantidad: int = Field(gt=0)


class RentaCreate(_Base):
    id_cliente: int
    fecha_inicio: date
    fecha_fin_estimada: date
    estado: Literal["Solicitada", "Reservada", "Activa"] = "Activa"
    detalles: list[DetalleCreate] = Field(min_length=1)

    @model_validator(mode="after")
    def _validar_fechas(self):
        if self.fecha_fin_estimada < self.fecha_inicio:
            raise ValueError("La fecha fin estimada no puede ser anterior a la fecha de inicio")
        return self


class CambioEstado(_Base):
    estado: Literal["Reservada", "Activa", "Finalizada", "Cancelada"]


class AprobarSolicitud(_Base):
    """El admin decide si la solicitud pasa a Reservada (apartar) o Activa
    (entregar de inmediato)."""

    estado: Literal["Reservada", "Activa"] = "Reservada"


class RechazarSolicitud(_Base):
    motivo: str = Field(min_length=3, max_length=500)


class DevolucionCreate(_Base):
    """Si id_detalles viene vacio se devuelven todas las lineas pendientes."""

    fecha_devolucion: date | None = None
    id_detalles: list[int] | None = None


# ------------------------------------------------------------------- Pago
class PagoCreate(_Base):
    monto_pagado: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    metodo_pago: METODOS_PAGO


# ---------------------------------------------------------- Seguridad
class LoginRequest(_Base):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RegistroRequest(_Base):
    nombre: str = Field(min_length=3, max_length=100)
    email: EmailStr
    telefono: str | None = Field(default=None, max_length=20)
    password: str = Field(min_length=8, max_length=128)


class PasswordChange(_Base):
    actual: str = Field(min_length=1, max_length=128)
    nueva: str = Field(min_length=8, max_length=128)


class AccesoCliente(_Base):
    """Alta o reactivacion de la cuenta de un cliente existente."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    nombre: str | None = Field(default=None, max_length=100)


# ------------------------------------------------- Salida (solo docs)
class UsuarioOut(_Base):
    id_usuario: int
    email: str
    nombre: str
    rol: str
    id_cliente: int | None = None
    cliente: str | None = None


class RentaOut(_Base):
    id_renta: int
    id_cliente: int
    cliente: str
    id_estado: int
    estado: str
    fecha_registro: datetime
    fecha_inicio: date
    fecha_fin_estimada: date
    monto_total: Decimal
    pagado: Decimal
