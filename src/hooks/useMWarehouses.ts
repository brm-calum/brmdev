import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { MWarehouse, MWarehouseFormData } from '../lib/types/m-warehouse';
import { handleError, ValidationError, ERROR_MESSAGES } from '../lib/utils/errors';
import { useAuth } from '../contexts/AuthContext';
import { validateSpaceType, validateSize, validatePrice, validateDateRange } from '../lib/utils/errors';
import { AppError, PermissionError } from '../lib/utils/errors';

export function useMWarehouses() {
  const { user, hasRole } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMWarehouse = async (id: string): Promise<MWarehouse> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('m_warehouses')
        .select(`
          *,
          spaces:m_warehouse_spaces (
            *,
            space_type:m_space_types (*)
          ),
          images:m_warehouse_images (*),
          features:m_warehouse_feature_assignments(
            feature:warehouse_features(*)
          ),
          services:m_warehouse_service_assignments(
            service:warehouse_services(*),
            pricing_type,
            price_per_hour_cents,
            price_per_unit_cents,
            unit_type,
            notes
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Warehouse not found');

      // Transform the data structure to match expected types
      const transformedData = {
        ...data,
        features: (data.features || []).map(f => ({
          id: f.feature.id,
          name: f.feature.name,
          type: f.feature.type,
          icon: f.feature.icon,
          custom_value: f.custom_value
        })),
        services: (data.services || []).map(s => ({
          id: s.service.id,
          name: s.service.name,
          description: s.service.description,
          icon: s.service.icon,
          pricing_type: s.pricing_type,
          hourly_rate_cents: s.price_per_hour_cents,
          unit_rate_cents: s.price_per_unit_cents,
          unit_type: s.unit_type,
          notes: s.notes
        }))
      };

      return transformedData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load warehouse';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMWarehouses = async (): Promise<MWarehouse[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('m_warehouses')
        .select(`
          id,
          owner_id,
          name,
          description,
          address,
          city,
          country,
          postal_code,
          is_active,
          created_at,
          updated_at,
          spaces:m_warehouse_spaces(
            *,
            space_type:m_space_types(
              id,
              name,
              description
            )
          ),
          images:m_warehouse_images(*),
          features:warehouse_features!m_warehouse_feature_assignments(
            id,
            name,
            type,
            icon,
            custom_value:m_warehouse_feature_assignments!inner(custom_value)
          ),
          services:warehouse_services!m_warehouse_service_assignments(
            id,
            name,
            description,
            icon,
            pricing_type:m_warehouse_service_assignments!inner(pricing_type),
            price_per_hour_cents:m_warehouse_service_assignments!inner(price_per_hour_cents),
            price_per_unit_cents:m_warehouse_service_assignments!inner(price_per_unit_cents),
            unit_type:m_warehouse_service_assignments!inner(unit_type),
            notes:m_warehouse_service_assignments!inner(notes)
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      // Transform the data structure
      const transformedData = (data || []).map(warehouse => ({
        ...warehouse,
        features: warehouse.features || [],
        services: warehouse.services || []
      }));

      return transformedData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load warehouses';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createMWarehouse = async (formData: MWarehouseFormData): Promise<string> => {
    if (!hasRole('warehouse_owner')) {
      throw new PermissionError(ERROR_MESSAGES.insufficientPermissions);
    }

    try {
      setError(null);
      setIsLoading(true);

      // Validate spaces
      for (const space of formData.spaces) {
        if (!validateSpaceType(space.space_type_id)) {
          throw new ValidationError(ERROR_MESSAGES.invalidSpaceType);
        }
        if (!validateSize(space.size_m2)) {
          throw new ValidationError(ERROR_MESSAGES.invalidSize);
        }
        if (!validatePrice(space.price_per_m2_cents)) {
          throw new ValidationError(ERROR_MESSAGES.invalidPrice);
        }
      }
      
      const { data, error: createError } = await supabase
        .rpc('create_m_warehouse', {
          p_name: formData.name,
          p_description: formData.description,
          p_address: formData.address,
          p_city: formData.city,
          p_country: formData.country,
          p_postal_code: formData.postal_code,
          p_spaces: formData.spaces,
          p_features: formData.features || [],
          p_services: formData.services || [],
          p_images: formData.images
        });

      if (createError) throw createError;
      return data;
    } catch (err) {
      const appError = err instanceof AppError ? err : handleError(err, 'createMWarehouse');
      setError(appError.message);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const updateMWarehouse = async (id: string, formData: Partial<MWarehouseFormData>): Promise<void> => {
    try {
      setError(null);

      // Update warehouse details
      const { error: warehouseError } = await supabase
        .from('m_warehouses')
        .update({
          name: formData.name,
          description: formData.description,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          postal_code: formData.postal_code,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('owner_id', user?.id);

      if (warehouseError) throw warehouseError;

      // Update spaces if provided
      if (formData.spaces) {
        // Delete existing spaces
        await supabase
          .from('m_warehouse_spaces')
          .delete()
          .eq('warehouse_id', id);

        // Add space updates to transaction
        const { error: spacesError } = await supabase
          .from('m_warehouse_spaces')
          .insert(
            formData.spaces.map(space => ({
              warehouse_id: id,
              ...space
            }))
          );

        if (spacesError) throw spacesError;
      }

      // Update features if provided
      if (formData.features) {
        // Delete existing features
        await supabase
          .from('m_warehouse_feature_assignments')
          .delete()
          .eq('warehouse_id', id);

        // Add feature updates to transaction
        if (formData.features.length > 0) {
          const { error: featureError } = await supabase
            .from('m_warehouse_feature_assignments')
            .insert(
              formData.features
                .filter(feature => feature.id) // Filter out any features without IDs
                .map(feature => ({
                  warehouse_id: id,
                  feature_id: feature.id,
                  custom_value: feature.custom_value || null
                }))
            );

          if (featureError) throw featureError;
        }
      }

      // Update services if provided
      if (formData.services) {
        // Delete existing services
        await supabase
          .from('m_warehouse_service_assignments')
          .delete()
          .eq('warehouse_id', id);

        // Add service updates to transaction
        if (formData.services.length > 0) {
          const { error: serviceError } = await supabase
            .from('m_warehouse_service_assignments')
            .insert(
              formData.services
                .filter(service => service.id) // Filter out any services without IDs
                .map(service => ({
                  warehouse_id: id,
                  service_id: service.id,
                  pricing_type: service.pricing_type,
                  price_per_hour_cents: service.price_per_hour_cents || null,
                  price_per_unit_cents: service.price_per_unit_cents || null,
                  unit_type: service.unit_type || null,
                  notes: service.notes || null
                }))
            );

          if (serviceError) throw serviceError;
        }
      }

      // Update images if provided
      if (formData.images) {
        // Delete existing images
        const { error: deleteImageError } = await supabase
          .from('m_warehouse_images')
          .delete()
          .eq('warehouse_id', id);

        if (deleteImageError) throw deleteImageError;

        // Add image updates to transaction
        const { error: imagesError } = await supabase
          .from('m_warehouse_images')
          .insert(
            formData.images.map(image => ({
              warehouse_id: id,
              ...image
            }))
          );

        if (imagesError) throw imagesError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const deleteMWarehouse = async (id: string): Promise<void> => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('m_warehouses')
        .delete()
        .eq('id', id)
        .eq('owner_id', user?.id);

      if (deleteError) throw deleteError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const toggleMWarehouseStatus = async (id: string, isActive: boolean): Promise<void> => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('m_warehouses')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('owner_id', user?.id);

      if (updateError) throw updateError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  return {
    fetchMWarehouses,
    fetchMWarehouse,
    createMWarehouse,
    updateMWarehouse,
    deleteMWarehouse,
    toggleMWarehouseStatus,
    isLoading,
    error,
  };
}