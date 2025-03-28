import React from 'react'
import { cn } from "../lib/utils"

function Card({ className, ...props }) {
  return (
    <div className={cn("", className)} {...props} />
  )
}

function CardHeader({ className, ...props }) {
  return (
    <div className={cn("", className)} {...props} />
  )
}

function CardTitle({ className, ...props }) {
  return (
    <div className={cn("", className)} {...props} />
  )
}

function CardDescription({ className, ...props }) {
  return (
    <div className={cn("", className)} {...props} />
  )
}

function CardAction({ className, ...props }) {
  return (
    <div className={cn("", className)} {...props} />
  )
}

function CardContent({ className, ...props }) {
  return (
    <div className={cn("", className)} {...props} />
  )
}

function CardFooter({ className, ...props }) {
  return (
    <div className={cn("", className)} {...props} />
  )
}

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardAction, 
  CardDescription, 
  CardContent 
}